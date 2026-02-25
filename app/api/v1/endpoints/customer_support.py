"""
Customer support/contact endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pathlib import Path
from app.core.database import get_db
from app.core.config import settings
from app.models.support import SupportMessage
from app.api.v1.dependencies import get_current_customer
from typing import Optional
from uuid import UUID
import uuid

router = APIRouter()

ALLOWED_ATTACHMENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "application/pdf"}
MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/contact", response_model=dict, status_code=status.HTTP_201_CREATED)
async def submit_contact_message(
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db),
    subject: str = Form(...),
    message: str = Form(...),
    priority: str = Form("normal"),
    vendor_id: Optional[str] = Form(None),
    attachment: Optional[UploadFile] = File(None),
):
    """Submit a contact message (creates a support ticket). Optional: vendor (message about a store), picture/document upload."""
    customer_id = UUID(current_customer["customer_id"])
    valid_priorities = ["low", "normal", "high", "urgent"]
    priority = priority if priority in valid_priorities else "normal"
    vendor_uuid = None
    if vendor_id and vendor_id.strip():
        try:
            vendor_uuid = UUID(vendor_id.strip())
        except ValueError:
            pass
    attachment_url = None
    if attachment and attachment.filename:
        content = await attachment.read()
        if len(content) > MAX_ATTACHMENT_SIZE:
            raise HTTPException(status_code=400, detail="Attachment too large. Maximum 5MB.")
        if attachment.content_type and attachment.content_type not in ALLOWED_ATTACHMENT_TYPES:
            raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF.")
        ext = Path(attachment.filename).suffix or ".bin"
        if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"):
            ext = ".pdf"
        name = f"{uuid.uuid4()}{ext}"
        base = Path(settings.UPLOAD_DIR) / "support_attachments"
        base.mkdir(parents=True, exist_ok=True)
        (base / name).write_bytes(content)
        base_url = (settings.API_PUBLIC_URL or "").rstrip("/")
        attachment_url = f"{base_url}/api/v1/uploads/support_attachments/{name}" if base_url else f"/api/v1/uploads/support_attachments/{name}"
    support_message = SupportMessage(
        customer_id=customer_id,
        message_type="customer",
        subject=subject,
        message=message,
        priority=priority,
        status="open",
        vendor_id=vendor_uuid,
        attachment_url=attachment_url,
    )
    db.add(support_message)
    db.commit()
    db.refresh(support_message)
    return {
        "message": "Your message has been submitted successfully. We'll get back to you soon!",
        "ticket_id": str(support_message.id),
        "status": support_message.status,
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

