from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Appointment(Base):
    __tablename__ = 'appointments'
    __table_args__ = (
        UniqueConstraint('doctor_id', 'appointment_date', 'appointment_time', 'status', name='uq_doctor_datetime_active'),
    )

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    doctor_id = Column(Integer, ForeignKey('doctors.id'), nullable=False)
    appointment_date = Column(Date, nullable=False, index=True)
    appointment_time = Column(String(5), nullable=False)  # HH:MM format
    status = Column(
        String(30),
        nullable=False,
        default='Scheduled',
        # Scheduled, Confirmed, Checked In, In Consultation, Completed, Cancelled, No Show
    )
    reason = Column(Text)
    notes = Column(Text)
    duration_minutes = Column(Integer, default=15)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient = relationship("Patient", backref="appointments")
    doctor = relationship("Doctor", backref="appointments")
