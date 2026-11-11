from datetime import datetime
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict


class SettingUpdate(BaseModel):
    value: str


class SettingResponse(BaseModel):
    id: int
    key: str
    value: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SettingsBulkResponse(BaseModel):
    settings: Dict[str, str]
