from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, func
from app.db.base import Base


class Doctor(Base):
    __tablename__ = 'doctors'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    specialty = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    phone = Column(String(20))
    is_available = Column(Boolean, default=True)
    consultation_duration_minutes = Column(Integer, default=15)
    working_days = Column(JSON, default=list)  # ['Mon','Tue','Wed','Thu','Fri']
    working_hours_start = Column(String(5), default='09:00')
    working_hours_end = Column(String(5), default='17:00')
    bio = Column(String(500))
    avatar_initials = Column(String(5))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
