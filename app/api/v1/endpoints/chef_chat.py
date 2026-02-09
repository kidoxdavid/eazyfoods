"""
Chef chat endpoints - chat with admin
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.chat import ChatMessage
from app.api.v1.dependencies import get_current_chef
from pydantic import BaseModel

router = APIRouter()


class ChatMessageCreate(BaseModel):
    message: str
    recipient_type: str  # 'admin'
    recipient_id: Optional[str] = None  # Admin ID (can be None for "any admin")


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
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Send a message to admin"""
    chef_id = UUID(current_chef["chef_id"])
    
    if message_data.recipient_type != "admin":
        raise HTTPException(status_code=400, detail="recipient_type must be 'admin'")
    
    recipient_id = None
    if message_data.recipient_id:
        recipient_id = UUID(message_data.recipient_id)
    # For admin, recipient_id can be None (for "any admin")
    
    chat_message = ChatMessage(
        sender_type="chef",
        sender_id=chef_id,
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
    recipient_type: Optional[str] = Query(None, description="Filter by recipient type: 'admin'"),
    recipient_id: Optional[str] = Query(None, description="Filter by specific recipient ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get chat messages for current chef"""
    chef_id = UUID(current_chef["chef_id"])
    
    # Build query: messages where chef is sender or recipient
    query = db.query(ChatMessage).filter(
        or_(
            and_(
                ChatMessage.sender_type == "chef",
                ChatMessage.sender_id == chef_id
            ),
            and_(
                ChatMessage.recipient_type == "chef",
                ChatMessage.recipient_id == chef_id
            )
        )
    )
    
    if recipient_type:
        query = query.filter(ChatMessage.recipient_type == recipient_type)
    
    if recipient_id:
        query = query.filter(ChatMessage.recipient_id == UUID(recipient_id))
    
    messages = query.order_by(ChatMessage.created_at.desc()).offset(skip).limit(limit).all()
    
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

