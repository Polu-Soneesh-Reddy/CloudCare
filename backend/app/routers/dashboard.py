from datetime import date, timedelta
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.notification import Notification
from app.models.patient import Patient
from app.models.queue import QueueEntry
from app.schemas.appointment import VALID_STATUSES, AppointmentResponse
from app.schemas.notification import NotificationResponse
from app.schemas.queue import QueueEntryResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    today = date.today()

    # Appointment counts for today
    today_total = db.query(Appointment).filter(Appointment.appointment_date == today).count()
    today_completed = db.query(Appointment).filter(
        Appointment.appointment_date == today,
        Appointment.status == "Completed",
    ).count()
    today_cancelled = db.query(Appointment).filter(
        Appointment.appointment_date == today,
        Appointment.status == "Cancelled",
    ).count()

    # Waiting count: check QueueEntry waiting or Checked In appointments
    today_waiting = (
        db.query(QueueEntry)
        .join(Appointment, QueueEntry.appointment_id == Appointment.id)
        .filter(Appointment.appointment_date == today, QueueEntry.status == "Waiting")
        .count()
    )
    if today_waiting == 0:
        today_waiting = db.query(Appointment).filter(
            Appointment.appointment_date == today,
            Appointment.status == "Checked In",
        ).count()

    # Available doctors
    available_doctors = db.query(Doctor).filter(Doctor.is_available.is_(True)).count()

    # Avg wait minutes
    avg_wait = (
        db.query(func.avg(QueueEntry.estimated_wait_minutes))
        .join(Appointment, QueueEntry.appointment_id == Appointment.id)
        .filter(Appointment.appointment_date == today, QueueEntry.status.in_(["Waiting", "In Consultation"]))
        .scalar()
    )
    avg_wait_minutes = round(float(avg_wait)) if avg_wait is not None else 0

    # Appointment trend (last 7 days)
    trend: List[Dict[str, Any]] = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        cnt = db.query(Appointment).filter(Appointment.appointment_date == day).count()
        trend.append({"date": day.isoformat(), "count": cnt})

    # Status breakdown for today
    status_breakdown: List[Dict[str, Any]] = []
    for st in VALID_STATUSES:
        cnt = db.query(Appointment).filter(Appointment.appointment_date == today, Appointment.status == st).count()
        status_breakdown.append({"status": st, "count": cnt})

    # Today's appointments
    appointments = (
        db.query(Appointment, Patient.name.label("p_name"), Doctor.name.label("d_name"), Doctor.specialty.label("d_spec"))
        .join(Patient, Appointment.patient_id == Patient.id)
        .join(Doctor, Appointment.doctor_id == Doctor.id)
        .filter(Appointment.appointment_date == today)
        .order_by(Appointment.appointment_time.asc())
        .all()
    )
    todays_appointments = []
    for appt, p_name, d_name, d_spec in appointments:
        resp = AppointmentResponse.model_validate(appt)
        resp.patient_name = p_name
        resp.doctor_name = d_name
        resp.doctor_specialty = d_spec
        todays_appointments.append(resp.model_dump())

    # Current queue
    queue_records = (
        db.query(
            QueueEntry,
            Patient.name.label("p_name"),
            Doctor.name.label("d_name"),
            Appointment.appointment_date.label("appt_date"),
            Appointment.appointment_time.label("appt_time"),
        )
        .join(Appointment, QueueEntry.appointment_id == Appointment.id)
        .join(Patient, Appointment.patient_id == Patient.id)
        .join(Doctor, Appointment.doctor_id == Doctor.id)
        .filter(Appointment.appointment_date == today, QueueEntry.status.in_(["Waiting", "In Consultation"]))
        .order_by(QueueEntry.queue_number.asc())
        .all()
    )
    current_queue = []
    for q_entry, p_name, d_name, appt_date, appt_time in queue_records:
        q_resp = QueueEntryResponse.model_validate(q_entry)
        q_resp.patient_name = p_name
        q_resp.doctor_name = d_name
        q_resp.appointment_date = appt_date.isoformat() if appt_date else None
        q_resp.appointment_time = appt_time
        current_queue.append(q_resp.model_dump())

    # Doctor availability
    doctors = db.query(Doctor).all()
    doctor_availability = []
    for doc in doctors:
        doc_today_cnt = (
            db.query(Appointment)
            .filter(Appointment.doctor_id == doc.id, Appointment.appointment_date == today)
            .count()
        )
        doctor_availability.append({
            "id": doc.id,
            "name": doc.name,
            "specialty": doc.specialty,
            "is_available": doc.is_available,
            "today_count": doc_today_cnt,
        })

    # Recent notifications (last 5)
    notifications = (
        db.query(Notification)
        .order_by(Notification.created_at.desc())
        .limit(5)
        .all()
    )
    recent_notifications = [NotificationResponse.model_validate(n).model_dump() for n in notifications]

    return {
        "today_total": today_total,
        "today_waiting": today_waiting,
        "today_completed": today_completed,
        "today_cancelled": today_cancelled,
        "available_doctors": available_doctors,
        "avg_wait_minutes": avg_wait_minutes,
        "appointment_trend": trend,
        "status_breakdown": status_breakdown,
        "todays_appointments": todays_appointments,
        "current_queue": current_queue,
        "doctor_availability": doctor_availability,
        "recent_notifications": recent_notifications,
    }
