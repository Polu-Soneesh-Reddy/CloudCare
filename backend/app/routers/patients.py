import math
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.routers.auth import get_current_user
from app.schemas.common import PaginatedResponse
from app.schemas.patient import PatientCreate, PatientResponse

router = APIRouter(
    prefix="/patients",
    tags=["patients"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[PatientResponse])
def list_patients(
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Patient)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Patient.name.ilike(search_pattern),
                Patient.email.ilike(search_pattern),
                Patient.phone.ilike(search_pattern),
            )
        )

    total = query.count()
    offset = (page - 1) * size
    patients = query.order_by(Patient.name.asc()).offset(offset).limit(size).all()
    pages = math.ceil(total / size) if size > 0 else 0

    return PaginatedResponse[PatientResponse](
        items=[PatientResponse.model_validate(p) for p in patients],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(data: PatientCreate, db: Session = Depends(get_db)):
    if data.email:
        existing = db.query(Patient).filter(Patient.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient with email '{data.email}' already exists",
            )

    patient = Patient(
        name=data.name,
        email=data.email,
        phone=data.phone,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        address=data.address,
        emergency_contact_name=data.emergency_contact_name,
        emergency_contact_phone=data.emergency_contact_phone,
        blood_group=data.blood_group,
        allergies=data.allergies,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.get("/{patient_id}")
def get_patient(patient_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with id {patient_id} not found",
        )

    appointments = (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
        .all()
    )

    resp = PatientResponse.model_validate(patient).model_dump()
    resp["appointments"] = [
        {
            "id": a.id,
            "doctor_id": a.doctor_id,
            "appointment_date": a.appointment_date.isoformat(),
            "appointment_time": a.appointment_time,
            "status": a.status,
            "reason": a.reason,
            "notes": a.notes,
            "duration_minutes": a.duration_minutes,
        }
        for a in appointments
    ]
    return resp
