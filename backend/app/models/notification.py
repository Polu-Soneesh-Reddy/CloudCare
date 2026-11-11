from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func
from app.db.base import Base


class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default='info')  # info, success, warning, error
    category = Column(String(50), default='general')  # appointment, queue, system
    is_read = Column(Boolean, default=False)
    related_id = Column(Integer, nullable=True)  # appointment or queue entry ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
