import math
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.notification import Notification
from app.routers.auth import get_current_user
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.notification import NotificationCreate, NotificationResponse

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[NotificationResponse])
def list_notifications(
    is_read: Optional[bool] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Notification)

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    if category is not None:
        query = query.filter(Notification.category == category)

    total = query.count()
    offset = (page - 1) * size
    notifications = (
        query.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )
    pages = math.ceil(total / size) if size > 0 else 0

    return PaginatedResponse[NotificationResponse](
        items=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/unread-count")
def get_unread_count(db: Session = Depends(get_db)) -> Dict[str, int]:
    count = db.query(Notification).filter(Notification.is_read.is_(False)).count()
    return {"count": count}


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(data: NotificationCreate, db: Session = Depends(get_db)):
    notification = Notification(
        title=data.title,
        message=data.message,
        type=data.type,
        category=data.category,
        related_id=data.related_id,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return NotificationResponse.model_validate(notification)


@router.put("/read-all", response_model=MessageResponse)
def mark_all_as_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.is_read.is_(False)).update({"is_read": True})
    db.commit()
    return MessageResponse(message="All notifications marked as read")


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(notification_id: int, db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with id {notification_id} not found",
        )
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return NotificationResponse.model_validate(notification)
