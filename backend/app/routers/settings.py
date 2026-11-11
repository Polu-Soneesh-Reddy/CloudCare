from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.settings import ClinicSettings
from app.routers.auth import get_current_user
from app.schemas.settings import SettingResponse, SettingUpdate, SettingsBulkResponse

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
    dependencies=[Depends(get_current_user)],
)

DEFAULT_SETTINGS: Dict[str, Dict[str, str]] = {
    "clinic_name": {"value": "CloudCare Medical Center", "description": "Clinic display name"},
    "default_appointment_duration": {"value": "15", "description": "Default appointment length in minutes"},
    "estimated_consultation_duration": {"value": "15", "description": "Consultation time used for queue wait estimation"},
    "max_queue_size": {"value": "50", "description": "Maximum patients allowed in active queue"},
    "working_hours_start": {"value": "09:00", "description": "Daily clinic opening time"},
    "working_hours_end": {"value": "17:00", "description": "Daily clinic closing time"},
    "timezone": {"value": "UTC", "description": "Clinic operating timezone"},
}


def ensure_default_settings(db: Session):
    for key, info in DEFAULT_SETTINGS.items():
        existing = db.query(ClinicSettings).filter(ClinicSettings.key == key).first()
        if not existing:
            setting = ClinicSettings(key=key, value=info["value"], description=info["description"])
            db.add(setting)
    db.commit()


@router.get("/", response_model=SettingsBulkResponse)
def get_all_settings(db: Session = Depends(get_db)):
    ensure_default_settings(db)
    all_settings = db.query(ClinicSettings).all()
    settings_map = {s.key: s.value for s in all_settings}
    return SettingsBulkResponse(settings=settings_map)


@router.get("/{key}", response_model=SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(ClinicSettings).filter(ClinicSettings.key == key).first()
    if not setting:
        if key in DEFAULT_SETTINGS:
            setting = ClinicSettings(
                key=key,
                value=DEFAULT_SETTINGS[key]["value"],
                description=DEFAULT_SETTINGS[key]["description"],
            )
            db.add(setting)
            db.commit()
            db.refresh(setting)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting with key '{key}' not found",
            )
    return SettingResponse.model_validate(setting)


@router.put("/{key}", response_model=SettingResponse)
def update_setting(key: str, data: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(ClinicSettings).filter(ClinicSettings.key == key).first()
    now_utc = datetime.now(timezone.utc)
    if not setting:
        desc = DEFAULT_SETTINGS.get(key, {}).get("description")
        setting = ClinicSettings(
            key=key,
            value=data.value,
            description=desc,
            updated_at=now_utc,
        )
        db.add(setting)
    else:
        setting.value = data.value
        setting.updated_at = now_utc

    db.commit()
    db.refresh(setting)
    return SettingResponse.model_validate(setting)
