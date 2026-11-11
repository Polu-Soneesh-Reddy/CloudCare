from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class QueueEntry(Base):
    __tablename__ = 'queue_entries'

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    queue_number = Column(Integer, nullable=False)
    status = Column(String(30), default='Waiting')  # Waiting, In Consultation, Completed, Cancelled
    estimated_wait_minutes = Column(Integer, default=0)
    checked_in_at = Column(DateTime(timezone=True))
    called_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    appointment = relationship("Appointment", backref="queue_entries")
