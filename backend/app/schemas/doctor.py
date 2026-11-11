from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class DoctorBase(BaseModel):
    name: str
    specialty: str
    department: str
    email: str
    phone: Optional[str] = None
    is_available: bool = True
    consultation_duration_minutes: int = 15
    working_days: List[str] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    working_hours_start: str = '09:00'
    working_hours_end: str = '17:00'
    bio: Optional[str] = None
    avatar_initials: Optional[str] = None


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    department: Optional[str] = None
    is_available: Optional[bool] = None
    consultation_duration_minutes: Optional[int] = None
    working_days: Optional[List[str]] = None
    working_hours_start: Optional[str] = None
    working_hours_end: Optional[str] = None
    bio: Optional[str] = None
    avatar_initials: Optional[str] = None


class DoctorResponse(DoctorBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    appointment_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
