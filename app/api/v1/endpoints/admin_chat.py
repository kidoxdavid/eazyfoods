"""
Admin chat endpoints - chat with customers, vendors, and drivers
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.chat import ChatMessage
from app.models.vendor import Vendor
from app.api.v1.dependencies import get_current_admin
from pydantic import BaseModel

router = APIRouter()


class ChatMessageCreate(BaseModel):
    message: str
    recipient_type: str  # 'customer', 'vendor', 'driver', or 'chef'
    recipient_id: str  # Required for admin


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
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Send a message to customer, vendor, driver, or chef"""
    admin_id = UUID(current_admin["admin_id"])
    
    if message_data.recipient_type not in ["customer", "vendor", "driver", "chef"]:
        raise HTTPException(status_code=400, detail="recipient_type must be 'customer', 'vendor', 'driver', or 'chef'")
    
    recipient_id = UUID(message_data.recipient_id)
    
    chat_message = ChatMessage(
        sender_type="admin",
        sender_id=admin_id,
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
    recipient_type: Optional[str] = Query(None, description="Filter by recipient type: 'customer', 'vendor', 'driver', or 'chef'"),
    recipient_id: Optional[str] = Query(None, description="Filter by specific recipient ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get chat messages for admin"""
    admin_id = UUID(current_admin["admin_id"])
    
    # Build query - get messages where admin is sender or recipient
    # For recipient, include messages where recipient_id is NULL (for "any admin") or matches this admin_id
    query = db.query(ChatMessage).filter(
        or_(
            and_(
                ChatMessage.sender_type == "admin",
                ChatMessage.sender_id == admin_id
            ),
            and_(
                ChatMessage.recipient_type == "admin",
                or_(
                    ChatMessage.recipient_id == admin_id,
                    ChatMessage.recipient_id.is_(None)  # Messages to "any admin"
                )
            )
        )
    )
    
    # Filter by recipient type if provided
    if recipient_type:
        query = query.filter(
            or_(
                and_(
                    ChatMessage.sender_type == recipient_type,
                    ChatMessage.recipient_type == "admin",
                    or_(
                        ChatMessage.recipient_id == admin_id,
                        ChatMessage.recipient_id.is_(None)
                    )
                ),
                and_(
                    ChatMessage.recipient_type == recipient_type,
                    ChatMessage.sender_type == "admin",
                    ChatMessage.sender_id == admin_id
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
                    ChatMessage.recipient_type == "admin",
                    or_(
                        ChatMessage.recipient_id == admin_id,
                        ChatMessage.recipient_id.is_(None)
                    )
                ),
                and_(
                    ChatMessage.recipient_id == recipient_uuid,
                    ChatMessage.sender_type == "admin",
                    ChatMessage.sender_id == admin_id
                )
            )
        )
    
    messages = query.order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()
    
    # Mark messages as read
    for msg in messages:
        if msg.recipient_type == "admin" and (msg.recipient_id == admin_id or msg.recipient_id is None) and not msg.is_read:
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


@router.get("/conversations", response_model=List[dict])
async def get_conversations(
    conversation_type: Optional[str] = Query(None, description="Filter by conversation type: 'customer', 'vendor', 'driver', or 'chef'"),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get list of conversations for admin"""
    admin_id = UUID(current_admin["admin_id"])
    
    # Get unique recipients/senders
    sent_messages = db.query(
        ChatMessage.recipient_type,
        ChatMessage.recipient_id,
        ChatMessage.created_at
    ).filter(
        ChatMessage.sender_type == "admin",
        ChatMessage.sender_id == admin_id
    ).all()
    
    received_messages = db.query(
        ChatMessage.sender_type,
        ChatMessage.sender_id,
        ChatMessage.created_at
    ).filter(
        ChatMessage.recipient_type == "admin",
        or_(
            ChatMessage.recipient_id == admin_id,
            ChatMessage.recipient_id.is_(None)  # Messages sent to "any admin"
        )
    ).all()
    
    # Combine and get unique conversations
    conversations = {}
    for msg in sent_messages:
        key = f"{msg.recipient_type}_{msg.recipient_id}"
        if key not in conversations or msg.created_at > conversations[key]["last_message_at"]:
            conversations[key] = {
                "type": msg.recipient_type,
                "id": str(msg.recipient_id),
                "last_message_at": msg.created_at
            }
    
    for msg in received_messages:
        key = f"{msg.sender_type}_{msg.sender_id}"
        if key not in conversations or msg.created_at > conversations[key]["last_message_at"]:
            conversations[key] = {
                "type": msg.sender_type,
                "id": str(msg.sender_id),
                "last_message_at": msg.created_at
            }
    
    result = list(conversations.values())

    # Enrich conversations with human-friendly names where possible
    # Vendors
    vendor_ids = [UUID(c["id"]) for c in result if c["type"] == "vendor" and c.get("id")]
    vendor_map = {}
    if vendor_ids:
        vendors = db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()
        vendor_map = {str(v.id): v for v in vendors}

    for c in result:
        if c["type"] == "vendor":
            vendor = vendor_map.get(c["id"])
            if vendor:
                c["name"] = vendor.business_name
                c["email"] = vendor.email
    
    # Filter by type if provided
    if conversation_type:
        result = [c for c in result if c["type"] == conversation_type]

    # Sort by last message time
    result.sort(key=lambda x: x["last_message_at"], reverse=True)
    
    return result

