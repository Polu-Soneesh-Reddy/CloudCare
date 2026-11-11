import re
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator

VALID_STATUSES: List[str] = [
    'Scheduled',
    'Confirmed',
    'Checked In',
    'In Consultation',
    'Completed',
    'Cancelled',
    'No Show',
]


class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: str  # HH:MM
    status: str = 'Scheduled'
    reason: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: int = 15

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {VALID_STATUSES}')
        return v

    @field_validator('appointment_time')
    @classmethod
    def validate_time(cls, v: str) -> str:
        if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', v):
            raise ValueError('Time must be in HH:MM format')
        return v


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None

    @field_validator('status', mode='before')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {VALID_STATUSES}')
        return v

    @field_validator('appointment_time')
    @classmethod
    def validate_time(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', v):
            raise ValueError('Time must be in HH:MM format')
        return v


class AppointmentResponse(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
