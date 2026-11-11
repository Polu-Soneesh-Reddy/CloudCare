from sqlalchemy import Column, Integer, String, Date, DateTime, func
from app.db.base import Base


class Patient(Base):
    __tablename__ = 'patients'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(200), unique=True)
    phone = Column(String(20))
    date_of_birth = Column(Date)
    gender = Column(String(20))
    address = Column(String(300))
    emergency_contact_name = Column(String(150))
    emergency_contact_phone = Column(String(20))
    blood_group = Column(String(10))
    allergies = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
