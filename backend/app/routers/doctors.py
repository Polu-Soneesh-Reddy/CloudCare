from datetime import date, datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.routers.auth import get_current_user
from app.schemas.doctor import DoctorCreate, DoctorResponse, DoctorUpdate

router = APIRouter(
    prefix="/doctors",
    tags=["doctors"],
    dependencies=[Depends(get_current_user)],
)


def _compute_initials(name: str) -> str:
    cleaned = name.replace("Dr.", "").replace("Dr ", "").strip()
    parts = cleaned.split()
    if not parts:
        return "DR"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return f"{parts[0][0]}{parts[1][0]}".upper()


def _to_doctor_response(doc: Doctor, db: Session) -> DoctorResponse:
    today = date.today()
    count = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == doc.id, Appointment.appointment_date == today)
        .count()
    )
    resp = DoctorResponse.model_validate(doc)
    resp.appointment_count = count
    return resp


@router.get("/", response_model=List[DoctorResponse])
def list_doctors(db: Session = Depends(get_db)):
    doctors = db.query(Doctor).order_by(Doctor.name.asc()).all()
    return [_to_doctor_response(doc, db) for doc in doctors]


@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(data: DoctorCreate, db: Session = Depends(get_db)):
    existing = db.query(Doctor).filter(Doctor.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Doctor with email '{data.email}' already exists",
        )

    initials = data.avatar_initials or _compute_initials(data.name)

    doctor = Doctor(
        name=data.name,
        specialty=data.specialty,
        department=data.department,
        email=data.email,
        phone=data.phone,
        is_available=data.is_available,
        consultation_duration_minutes=data.consultation_duration_minutes,
        working_days=data.working_days,
        working_hours_start=data.working_hours_start,
        working_hours_end=data.working_hours_end,
        bio=data.bio,
        avatar_initials=initials,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return _to_doctor_response(doctor, db)


@router.get("/{doctor_id}")
def get_doctor(doctor_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with id {doctor_id} not found",
        )

    today = date.today()
    today_appts = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == doctor_id, Appointment.appointment_date == today)
        .order_by(Appointment.appointment_time.asc())
        .all()
    )

    doc_resp = _to_doctor_response(doctor, db)
    doc_dict = doc_resp.model_dump()
    doc_dict["today_appointments"] = [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "appointment_date": a.appointment_date.isoformat(),
            "appointment_time": a.appointment_time,
            "status": a.status,
            "reason": a.reason,
            "duration_minutes": a.duration_minutes,
        }
        for a in today_appts
    ]
    return doc_dict


@router.put("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(doctor_id: int, data: DoctorUpdate, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with id {doctor_id} not found",
        )

    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(doctor, field, value)

    db.commit()
    db.refresh(doctor)
    return _to_doctor_response(doctor, db)


@router.get("/{doctor_id}/slots")
def get_doctor_slots(
    doctor_id: int,
    slot_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with id {doctor_id} not found",
        )

    # Parse working hours
    try:
        start_h, start_m = map(int, (doctor.working_hours_start or "09:00").split(":"))
        end_h, end_m = map(int, (doctor.working_hours_end or "17:00").split(":"))
    except ValueError:
        start_h, start_m = 9, 0
        end_h, end_m = 17, 0

    duration = doctor.consultation_duration_minutes or 15
    if duration <= 0:
        duration = 15

    start_total_mins = start_h * 60 + start_m
    end_total_mins = end_h * 60 + end_m

    all_slots: List[str] = []
    cur_mins = start_total_mins
    while cur_mins + duration <= end_total_mins:
        h = cur_mins // 60
        m = cur_mins % 60
        all_slots.append(f"{h:02d}:{m:02d}")
        cur_mins += duration

    # Active appointments occupying slots
    active_statuses = ["Scheduled", "Confirmed", "Checked In", "In Consultation"]
    booked = (
        db.query(Appointment.appointment_time)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == slot_date,
            Appointment.status.in_(active_statuses),
        )
        .all()
    )
    booked_slots = {b[0] for b in booked}

    available_slots = [s for s in all_slots if s not in booked_slots]

    return {
        "doctor_id": doctor_id,
        "date": slot_date.isoformat(),
        "available_slots": available_slots,
        "booked_slots": list(booked_slots),
        "total_available": len(available_slots),
    }
