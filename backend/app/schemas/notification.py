from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = 'info'
    category: str = 'general'
    related_id: Optional[int] = None


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    category: str
    is_read: bool
    related_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
