"""
Vendor chat endpoints - chat with admin and driver
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.chat import ChatMessage
from app.api.v1.dependencies import get_current_vendor
from pydantic import BaseModel

router = APIRouter()


class ChatMessageCreate(BaseModel):
    message: str
    recipient_type: str  # 'admin' or 'driver'
    recipient_id: Optional[str] = None  # Admin ID or Driver ID


class ChatMessageResponse(BaseModel):
    id: str
    sender_type: str
    sender_id: str
    recipient_type: str
    recipient_id: Optional[str]
    message: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: ChatMessageCreate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Send a message to admin or driver"""
    vendor_id = UUID(current_vendor["vendor_id"])
    
    if message_data.recipient_type not in ["admin", "driver"]:
        raise HTTPException(status_code=400, detail="recipient_type must be 'admin' or 'driver'")
    
    recipient_id = None
    if message_data.recipient_id:
        recipient_id = UUID(message_data.recipient_id)
    else:
        # For admin, recipient_id can be None (for "any admin"). For driver, require ID
        if message_data.recipient_type == "admin":
            recipient_id = None  # NULL for "any admin"
        else:
            raise HTTPException(status_code=400, detail="recipient_id is required for driver messages")
    
    chat_message = ChatMessage(
        sender_type="vendor",
        sender_id=vendor_id,
        recipient_type=message_data.recipient_type,
        recipient_id=recipient_id,
        message=message_data.message,
        is_read=False
    )
    
    db.add(chat_message)
    db.commit()
    db.refresh(chat_message)
    
    return {
        "id": str(chat_message.id),
        "sender_type": chat_message.sender_type,
        "sender_id": str(chat_message.sender_id),
        "recipient_type": chat_message.recipient_type,
        "recipient_id": str(chat_message.recipient_id) if chat_message.recipient_id else None,
        "message": chat_message.message,
        "is_read": chat_message.is_read,
        "created_at": chat_message.created_at
    }


@router.get("/messages", response_model=List[ChatMessageResponse])
async def get_messages(
    recipient_type: Optional[str] = Query(None, description="Filter by recipient type: 'admin' or 'driver'"),
    recipient_id: Optional[str] = Query(None, description="Filter by specific recipient ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get chat messages for vendor"""
    vendor_id = UUID(current_vendor["vendor_id"])
    
    # Build query
    query = db.query(ChatMessage).filter(
        or_(
            and_(
                ChatMessage.sender_type == "vendor",
                ChatMessage.sender_id == vendor_id
            ),
            and_(
                ChatMessage.recipient_type == "vendor",
                ChatMessage.recipient_id == vendor_id
            )
        )
    )
    
    # Filter by recipient type if provided
    if recipient_type:
        query = query.filter(
            or_(
                and_(
                    ChatMessage.sender_type == recipient_type,
                    ChatMessage.recipient_type == "vendor",
                    ChatMessage.recipient_id == vendor_id
                ),
                and_(
                    ChatMessage.recipient_type == recipient_type,
                    ChatMessage.sender_type == "vendor",
                    ChatMessage.sender_id == vendor_id
                )
            )
        )
    
    # Filter by specific recipient ID if provided
    if recipient_id:
        recipient_uuid = UUID(recipient_id)
        query = query.filter(
            or_(
                and_(
                    ChatMessage.sender_id == recipient_uuid,
                    ChatMessage.recipient_type == "vendor",
                    ChatMessage.recipient_id == vendor_id
                ),
                and_(
                    ChatMessage.recipient_id == recipient_uuid,
                    ChatMessage.sender_type == "vendor",
                    ChatMessage.sender_id == vendor_id
                )
            )
        )
    
    messages = query.order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()
    
    # Mark messages as read
    for msg in messages:
        if msg.recipient_type == "vendor" and msg.recipient_id == vendor_id and not msg.is_read:
            msg.is_read = True
            msg.read_at = datetime.utcnow()
    db.commit()
    
    return [
        {
            "id": str(msg.id),
            "sender_type": msg.sender_type,
            "sender_id": str(msg.sender_id),
            "recipient_type": msg.recipient_type,
            "recipient_id": str(msg.recipient_id) if msg.recipient_id else None,
            "message": msg.message,
            "is_read": msg.is_read,
            "created_at": msg.created_at
        }
        for msg in messages
    ]

