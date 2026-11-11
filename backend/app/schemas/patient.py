from datetime import date, datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict


class PatientBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PatientDetailResponse(PatientResponse):
    appointments: List[Any] = []

    model_config = ConfigDict(from_attributes=True)
