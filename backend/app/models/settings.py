from sqlalchemy import Column, Integer, String, DateTime, func
from app.db.base import Base


class ClinicSettings(Base):
    __tablename__ = 'clinic_settings'

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(500), nullable=False)
    description = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
