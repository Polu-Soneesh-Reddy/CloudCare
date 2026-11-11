from datetime import date
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.routers.auth import get_current_user
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)
from app.schemas.common import MessageResponse, PaginatedResponse

router = APIRouter(
    prefix="/appointments",
    tags=["appointments"],
    dependencies=[Depends(get_current_user)],
)

ACTIVE_STATUSES = ["Scheduled", "Confirmed", "Checked In", "In Consultation"]

ALLOWED_TRANSITIONS = {
    "Scheduled": {"Confirmed", "Cancelled", "No Show"},
    "Confirmed": {"Checked In", "Cancelled", "No Show"},
    "Checked In": {"In Consultation", "Cancelled"},
    "In Consultation": {"Completed", "Cancelled"},
    "Completed": set(),
    "Cancelled": set(),
    "No Show": set(),
}


def _enrich_appointment(appt: Appointment, db: Session) -> AppointmentResponse:
    resp = AppointmentResponse.model_validate(appt)
    if appt.patient:
        resp.patient_name = appt.patient.name
    else:
        p = db.query(Patient).filter(Patient.id == appt.patient_id).first()
        if p:
            resp.patient_name = p.name

    if appt.doctor:
        resp.doctor_name = appt.doctor.name
        resp.doctor_specialty = appt.doctor.specialty
    else:
        d = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
        if d:
            resp.doctor_name = d.name
            resp.doctor_specialty = d.specialty
    return resp


@router.get("/", response_model=PaginatedResponse[AppointmentResponse])
def list_appointments(
    appointment_date: Optional[date] = Query(None, alias="date"),
    doctor_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    patient_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Appointment)

    if appointment_date is not None:
        query = query.filter(Appointment.appointment_date == appointment_date)
    if doctor_id is not None:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if status_filter is not None:
        query = query.filter(Appointment.status == status_filter)
    if patient_id is not None:
        query = query.filter(Appointment.patient_id == patient_id)

    total = query.count()
    offset = (page - 1) * size
    appointments = (
        query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.asc())
        .offset(offset)
        .limit(size)
        .all()
    )

    items = [_enrich_appointment(a, db) for a in appointments]
    pages = math.ceil(total / size) if size > 0 else 0

    return PaginatedResponse[AppointmentResponse](
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db)):
    if data.appointment_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book appointments in the past",
        )

    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with id {data.patient_id} not found",
        )

    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with id {data.doctor_id} not found",
        )

    # Check duplicate active booking for same doctor + date + time
    duplicate = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == data.doctor_id,
            Appointment.appointment_date == data.appointment_date,
            Appointment.appointment_time == data.appointment_time,
            Appointment.status.in_(ACTIVE_STATUSES),
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Doctor already has an active appointment at this date and time",
        )

    appointment = Appointment(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        appointment_time=data.appointment_time,
        status=data.status,
        reason=data.reason,
        notes=data.notes,
        duration_minutes=data.duration_minutes,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return _enrich_appointment(appointment, db)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with id {appointment_id} not found",
        )
    return _enrich_appointment(appointment, db)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(appointment_id: int, data: AppointmentUpdate, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with id {appointment_id} not found",
        )

    update_dict = data.model_dump(exclude_unset=True)

    # Validate status transition if status is being updated
    if "status" in update_dict and update_dict["status"] is not None:
        new_status = update_dict["status"]
        if new_status != appointment.status:
            allowed = ALLOWED_TRANSITIONS.get(appointment.status, set())
            if new_status not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status transition from '{appointment.status}' to '{new_status}'",
                )

    # Check date if updating date
    target_date = update_dict.get("appointment_date", appointment.appointment_date)
    target_time = update_dict.get("appointment_time", appointment.appointment_time)

    if "appointment_date" in update_dict and update_dict["appointment_date"] is not None:
        if update_dict["appointment_date"] < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot set appointment date in the past",
            )

    # If date or time changed, verify no collision with another appointment
    if target_date != appointment.appointment_date or target_time != appointment.appointment_time:
        conflict = (
            db.query(Appointment)
            .filter(
                Appointment.id != appointment.id,
                Appointment.doctor_id == appointment.doctor_id,
                Appointment.appointment_date == target_date,
                Appointment.appointment_time == target_time,
                Appointment.status.in_(ACTIVE_STATUSES),
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Doctor already has an active appointment at target date and time",
            )

    for field, value in update_dict.items():
        setattr(appointment, field, value)

    db.commit()
    db.refresh(appointment)
    return _enrich_appointment(appointment, db)


@router.delete("/{appointment_id}", response_model=MessageResponse)
def cancel_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with id {appointment_id} not found",
        )

    if appointment.status in ["Completed", "Cancelled", "No Show"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel appointment with status '{appointment.status}'",
        )

    appointment.status = "Cancelled"
    db.commit()
    return MessageResponse(message="Appointment cancelled successfully")
