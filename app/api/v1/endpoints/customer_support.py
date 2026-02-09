"""
Customer support/contact endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.support import SupportMessage
from app.api.v1.dependencies import get_current_customer
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

router = APIRouter()


class ContactMessageCreate(BaseModel):
    subject: str
    message: str
    priority: Optional[str] = "normal"


@router.post("/contact", response_model=dict, status_code=status.HTTP_201_CREATED)
async def submit_contact_message(
    message_data: ContactMessageCreate,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Submit a contact message (creates a support ticket visible to admin)"""
    customer_id = UUID(current_customer["customer_id"])
    
    # Validate priority
    valid_priorities = ["low", "normal", "high", "urgent"]
    priority = message_data.priority if message_data.priority in valid_priorities else "normal"
    
    # Create support message
    support_message = SupportMessage(
        customer_id=customer_id,
        message_type="customer",
        subject=message_data.subject,
        message=message_data.message,
        priority=priority,
        status="open"
    )
    
    db.add(support_message)
    db.commit()
    db.refresh(support_message)
    
    return {
        "message": "Your message has been submitted successfully. We'll get back to you soon!",
        "ticket_id": str(support_message.id),
        "status": support_message.status
    }


@router.get("/my-messages", response_model=list)
async def get_my_contact_messages(
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get all contact messages submitted by the current customer"""
    customer_id = UUID(current_customer["customer_id"])
    
    messages = db.query(SupportMessage).filter(
        SupportMessage.customer_id == customer_id,
        SupportMessage.message_type == "customer"
    ).order_by(SupportMessage.created_at.desc()).all()
    
    return [
        {
            "id": str(msg.id),
            "subject": msg.subject,
            "message": msg.message,
            "status": msg.status,
            "priority": msg.priority,
            "created_at": msg.created_at.isoformat(),
            "updated_at": msg.updated_at.isoformat() if msg.updated_at else None,
            "resolved_at": msg.resolved_at.isoformat() if msg.resolved_at else None
        }
        for msg in messages
    ]

