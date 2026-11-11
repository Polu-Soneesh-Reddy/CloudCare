from datetime import date, datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.queue import QueueEntry
from app.routers.auth import get_current_user
from app.schemas.queue import (
    QueueEntryCreate,
    QueueEntryResponse,
    QueueStatusUpdate,
)

router = APIRouter(
    prefix="/queue",
    tags=["queue"],
    dependencies=[Depends(get_current_user)],
)

ALLOWED_QUEUE_TRANSITIONS = {
    "Waiting": {"In Consultation", "Cancelled"},
    "In Consultation": {"Completed", "Cancelled"},
    "Completed": set(),
    "Cancelled": set(),
}


def _enrich_queue_entry(entry: QueueEntry, db: Session) -> QueueEntryResponse:
    resp = QueueEntryResponse.model_validate(entry)
    appt = entry.appointment or db.query(Appointment).filter(Appointment.id == entry.appointment_id).first()
    if appt:
        resp.appointment_date = appt.appointment_date.isoformat() if appt.appointment_date else None
        resp.appointment_time = appt.appointment_time
        if appt.patient:
            resp.patient_name = appt.patient.name
        else:
            p = db.query(Patient).filter(Patient.id == appt.patient_id).first()
            if p:
                resp.patient_name = p.name

        if appt.doctor:
            resp.doctor_name = appt.doctor.name
        else:
            d = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
            if d:
                resp.doctor_name = d.name
    return resp


@router.get("/", response_model=List[QueueEntryResponse])
def list_queue(db: Session = Depends(get_db)):
    today = date.today()
    entries = (
        db.query(QueueEntry)
        .join(Appointment, QueueEntry.appointment_id == Appointment.id)
        .filter(Appointment.appointment_date == today)
        .order_by(QueueEntry.queue_number.asc())
        .all()
    )
    return [_enrich_queue_entry(e, db) for e in entries]


@router.post("/", response_model=QueueEntryResponse, status_code=status.HTTP_201_CREATED)
def add_to_queue(data: QueueEntryCreate, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == data.appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with id {data.appointment_id} not found",
        )

    # Check if already in queue
    existing = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.appointment_id == data.appointment_id,
            QueueEntry.status.in_(["Waiting", "In Consultation"]),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Appointment is already in the queue",
        )

    today = appointment.appointment_date or date.today()

    # Auto-assign queue number if not given
    if data.queue_number is not None:
        assigned_queue_num = data.queue_number
    else:
        max_q = (
            db.query(func.max(QueueEntry.queue_number))
            .join(Appointment, QueueEntry.appointment_id == Appointment.id)
            .filter(Appointment.appointment_date == today)
            .scalar()
        )
        assigned_queue_num = (max_q or 0) + 1

    # Calculate estimated wait time based on waiting entries ahead for the doctor
    doctor = appointment.doctor or db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
    duration = doctor.consultation_duration_minutes if (doctor and doctor.consultation_duration_minutes) else 15

    waiting_ahead = (
        db.query(QueueEntry)
        .join(Appointment, QueueEntry.appointment_id == Appointment.id)
        .filter(
            Appointment.doctor_id == appointment.doctor_id,
            Appointment.appointment_date == today,
            QueueEntry.status == "Waiting",
        )
        .count()
    )
    estimated_wait = waiting_ahead * duration

    # Update appointment status to 'Checked In' if Scheduled or Confirmed
    if appointment.status in ["Scheduled", "Confirmed"]:
        appointment.status = "Checked In"

    now_utc = datetime.now(timezone.utc)
    queue_entry = QueueEntry(
        appointment_id=data.appointment_id,
        queue_number=assigned_queue_num,
        status="Waiting",
        estimated_wait_minutes=estimated_wait,
        checked_in_at=now_utc,
    )
    db.add(queue_entry)
    db.commit()
    db.refresh(queue_entry)

    return _enrich_queue_entry(queue_entry, db)


@router.get("/{queue_id}", response_model=QueueEntryResponse)
def get_queue_entry(queue_id: int, db: Session = Depends(get_db)):
    entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue entry with id {queue_id} not found",
        )
    return _enrich_queue_entry(entry, db)


@router.put("/{queue_id}/status", response_model=QueueEntryResponse)
def update_queue_status(queue_id: int, data: QueueStatusUpdate, db: Session = Depends(get_db)):
    entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue entry with id {queue_id} not found",
        )

    if data.status != entry.status:
        allowed = ALLOWED_QUEUE_TRANSITIONS.get(entry.status, set())
        if data.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid queue status transition from '{entry.status}' to '{data.status}'",
            )

    now_utc = datetime.now(timezone.utc)
    appt = entry.appointment or db.query(Appointment).filter(Appointment.id == entry.appointment_id).first()

    if data.status == "In Consultation":
        entry.called_at = now_utc
        if appt and appt.status != "In Consultation":
            appt.status = "In Consultation"
    elif data.status == "Completed":
        entry.completed_at = now_utc
        if appt and appt.status != "Completed":
            appt.status = "Completed"
    elif data.status == "Cancelled":
        if appt and appt.status != "Cancelled":
            appt.status = "Cancelled"

    entry.status = data.status

    # Recalculate wait times for remaining waiting entries for this doctor
    if appt:
        doctor = appt.doctor or db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
        duration = doctor.consultation_duration_minutes if (doctor and doctor.consultation_duration_minutes) else 15
        remaining_waiting = (
            db.query(QueueEntry)
            .join(Appointment, QueueEntry.appointment_id == Appointment.id)
            .filter(
                Appointment.doctor_id == appt.doctor_id,
                Appointment.appointment_date == appt.appointment_date,
                QueueEntry.status == "Waiting",
                QueueEntry.id != entry.id,
            )
            .order_by(QueueEntry.queue_number.asc())
            .all()
        )
        for idx, item in enumerate(remaining_waiting):
            item.estimated_wait_minutes = idx * duration

    db.commit()
    db.refresh(entry)
    return _enrich_queue_entry(entry, db)
