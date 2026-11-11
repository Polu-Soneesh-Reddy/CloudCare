from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.queue import QueueEntry
from app.routers.auth import get_current_user
from app.schemas.appointment import VALID_STATUSES

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/appointments")
def get_appointment_analytics(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    end_date = date_to or date.today()
    start_date = date_from or (end_date - timedelta(days=30))

    # By Day
    by_day: List[Dict[str, Any]] = []
    curr = start_date
    while curr <= end_date:
        cnt = (
            db.query(Appointment)
            .filter(Appointment.appointment_date == curr)
            .count()
        )
        by_day.append({"date": curr.isoformat(), "count": cnt})
        curr += timedelta(days=1)

    # By Status
    by_status: List[Dict[str, Any]] = []
    for st in VALID_STATUSES:
        cnt = (
            db.query(Appointment)
            .filter(
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
                Appointment.status == st,
            )
            .count()
        )
        by_status.append({"status": st, "count": cnt})

    # By Doctor
    doctors = db.query(Doctor).all()
    by_doctor: List[Dict[str, Any]] = []
    for doc in doctors:
        cnt = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == doc.id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
            )
            .count()
        )
        by_doctor.append({
            "doctor_id": doc.id,
            "doctor_name": doc.name,
            "specialty": doc.specialty,
            "count": cnt,
        })

    return {
        "date_from": start_date.isoformat(),
        "date_to": end_date.isoformat(),
        "by_day": by_day,
        "by_status": by_status,
        "by_doctor": by_doctor,
    }


@router.get("/doctors")
def get_doctor_analytics(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    end_date = date_to or date.today()
    start_date = date_from or (end_date - timedelta(days=30))
    days_count = max(1, (end_date - start_date).days + 1)

    doctors = db.query(Doctor).all()
    results = []
    for doc in doctors:
        appts = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == doc.id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
            )
            .all()
        )
        total = len(appts)
        completed = sum(1 for a in appts if a.status == "Completed")
        rate = round((completed / total * 100), 1) if total > 0 else 0.0
        avg_per_day = round(total / days_count, 1)

        results.append({
            "doctor_id": doc.id,
            "doctor_name": doc.name,
            "specialty": doc.specialty,
            "department": doc.department,
            "appointment_count": total,
            "completed_count": completed,
            "completion_rate": rate,
            "avg_per_day": avg_per_day,
        })

    return results


@router.get("/queue")
def get_queue_analytics(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    end_date = date_to or date.today()
    start_date = date_from or (end_date - timedelta(days=30))

    # Avg wait times by day
    by_day: List[Dict[str, Any]] = []
    curr = start_date
    while curr <= end_date:
        avg_val = (
            db.query(func.avg(QueueEntry.estimated_wait_minutes))
            .join(Appointment, QueueEntry.appointment_id == Appointment.id)
            .filter(Appointment.appointment_date == curr)
            .scalar()
        )
        by_day.append({
            "date": curr.isoformat(),
            "avg_wait_minutes": round(float(avg_val), 1) if avg_val is not None else 0.0,
        })
        curr += timedelta(days=1)

    # Avg wait times by doctor
    doctors = db.query(Doctor).all()
    by_doctor: List[Dict[str, Any]] = []
    for doc in doctors:
        avg_val = (
            db.query(func.avg(QueueEntry.estimated_wait_minutes))
            .join(Appointment, QueueEntry.appointment_id == Appointment.id)
            .filter(
                Appointment.doctor_id == doc.id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
            )
            .scalar()
        )
        by_doctor.append({
            "doctor_id": doc.id,
            "doctor_name": doc.name,
            "specialty": doc.specialty,
            "avg_wait_minutes": round(float(avg_val), 1) if avg_val is not None else 0.0,
        })

    return {
        "date_from": start_date.isoformat(),
        "date_to": end_date.isoformat(),
        "by_day": by_day,
        "by_doctor": by_doctor,
    }
