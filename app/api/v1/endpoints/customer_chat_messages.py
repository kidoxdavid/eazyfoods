"""
Customer chat endpoints - chat with admin
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.chat import ChatMessage
from app.api.v1.dependencies import get_current_customer
from pydantic import BaseModel

router = APIRouter()


class ChatMessageCreate(BaseModel):
    message: str
    recipient_type: str = "admin"  # Always admin for customers
    recipient_id: Optional[str] = None  # Admin ID, can be None (will find an admin)


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
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Send a message to admin"""
    customer_id = UUID(current_customer["customer_id"])
    
    # For now, set recipient_id to None (or find first admin). In production, you might want to route to a specific admin
    # For simplicity, we'll use a placeholder UUID or handle None
    recipient_id = None
    if message_data.recipient_id:
        recipient_id = UUID(message_data.recipient_id)
    
    # Create chat message
    chat_message = ChatMessage(
        sender_type="customer",
        sender_id=customer_id,
        recipient_type=message_data.recipient_type,
        recipient_id=recipient_id or UUID('00000000-0000-0000-0000-000000000000'),  # Placeholder for "any admin"
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
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get chat messages between customer and admin"""
    customer_id = UUID(current_customer["customer_id"])
    
    # Get messages where customer is sender or recipient
    messages = db.query(ChatMessage).filter(
        or_(
            and_(
                ChatMessage.sender_type == "customer",
                ChatMessage.sender_id == customer_id,
                ChatMessage.recipient_type == "admin"
            ),
            and_(
                ChatMessage.recipient_type == "customer",
                ChatMessage.recipient_id == customer_id,
                ChatMessage.sender_type == "admin"
            )
        )
    ).order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()
    
    # Mark messages as read
    for msg in messages:
        if msg.recipient_type == "customer" and msg.recipient_id == customer_id and not msg.is_read:
            msg.is_read = True
            msg.read_at = datetime.utcnow()
    db.commit()
    
    return [
        {
            "id": str(msg.id),
            "sender_type": msg.sender_type,
            "sender_id": str(msg.sender_id),
            "recipient_type": msg.recipient_type,
            "recipient_id": str(msg.recipient_id),
            "message": msg.message,
            "is_read": msg.is_read,
            "created_at": msg.created_at
        }
        for msg in messages
    ]

