from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator

VALID_QUEUE_STATUSES: List[str] = ['Waiting', 'In Consultation', 'Completed', 'Cancelled']


class QueueEntryCreate(BaseModel):
    appointment_id: int
    queue_number: Optional[int] = None


class QueueStatusUpdate(BaseModel):
    status: str

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_QUEUE_STATUSES:
            raise ValueError(f'Status must be one of {VALID_QUEUE_STATUSES}')
        return v


class QueueEntryResponse(BaseModel):
    id: int
    appointment_id: int
    queue_number: int
    status: str
    estimated_wait_minutes: int
    checked_in_at: Optional[datetime] = None
    called_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
