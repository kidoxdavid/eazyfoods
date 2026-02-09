"""
Support/chat endpoints for vendor-admin communication
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.support import SupportMessage
from app.schemas.support import SupportMessageCreate, SupportMessageResponse, SupportMessageUpdate
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.get("/", response_model=List[SupportMessageResponse])
async def get_support_messages(
    skip: int = 0,
    limit: int = 50,
    status_filter: str = None,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get all support messages for current vendor"""
    from uuid import UUID
    
    query = db.query(SupportMessage).filter(
        SupportMessage.vendor_id == UUID(current_vendor["vendor_id"])
    )
    
    if status_filter:
        query = query.filter(SupportMessage.status == status_filter)
    
    messages = query.order_by(SupportMessage.created_at.desc()).offset(skip).limit(limit).all()
    return messages


@router.post("/", response_model=SupportMessageResponse, status_code=status.HTTP_201_CREATED)
async def create_support_message(
    message_data: SupportMessageCreate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Create a new support message"""
    from uuid import UUID
    
    message = SupportMessage(
        vendor_id=UUID(current_vendor["vendor_id"]),
        vendor_user_id=UUID(current_vendor["user_id"]) if current_vendor.get("user_id") else None,
        subject=message_data.subject,
        message=message_data.message,
        priority=message_data.priority,
        status="open"
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/{message_id}", response_model=SupportMessageResponse)
async def get_support_message(
    message_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get a specific support message"""
    from uuid import UUID
    
    message = db.query(SupportMessage).filter(
        SupportMessage.id == UUID(message_id),
        SupportMessage.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Support message not found")
    
    return message


@router.put("/{message_id}", response_model=SupportMessageResponse)
async def update_support_message(
    message_id: str,
    message_update: SupportMessageUpdate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Update support message (e.g., mark as resolved)"""
    from uuid import UUID
    
    message = db.query(SupportMessage).filter(
        SupportMessage.id == UUID(message_id),
        SupportMessage.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Support message not found")
    
    update_data = message_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(message, field, value)
    
    if message_update.status == "resolved" and not message.resolved_at:
        from datetime import datetime
        message.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    return message

