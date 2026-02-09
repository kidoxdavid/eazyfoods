"""
Support endpoints for chefs
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.support import SupportMessage
from app.schemas.support import SupportMessageCreate, SupportMessageResponse, SupportMessageUpdate
from app.api.v1.dependencies import get_current_chef

router = APIRouter()


@router.get("/", response_model=List[SupportMessageResponse])
async def get_support_messages(
    skip: int = 0,
    limit: int = 50,
    status_filter: str = None,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get all support messages for current chef"""
    from uuid import UUID
    
    # Filter by chef_id if it exists in the model, otherwise use message_type
    query = db.query(SupportMessage).filter(
        SupportMessage.message_type == "chef"
    )
    
    # Try to filter by chef_id if the column exists
    try:
        chef_id = UUID(current_chef["chef_id"])
        # Check if chef_id column exists (it might not be in the model yet)
        if hasattr(SupportMessage, 'chef_id'):
            query = query.filter(SupportMessage.chef_id == chef_id)
    except:
        pass
    
    if status_filter:
        query = query.filter(SupportMessage.status == status_filter)
    
    messages = query.order_by(SupportMessage.created_at.desc()).offset(skip).limit(limit).all()
    return messages


@router.post("/", response_model=SupportMessageResponse, status_code=status.HTTP_201_CREATED)
async def create_support_message(
    message_data: SupportMessageCreate,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Create a new support message"""
    from uuid import UUID
    
    chef_id = UUID(current_chef["chef_id"])
    
    message = SupportMessage(
        vendor_id=None,  # Not a vendor message
        vendor_user_id=None,
        customer_id=None,  # Not a customer message
        message_type="chef",
        subject=message_data.subject,
        message=message_data.message,
        priority=message_data.priority,
        status="open"
    )
    
    # If chef_id column exists, set it
    if hasattr(message, 'chef_id'):
        message.chef_id = chef_id
    
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/{message_id}", response_model=SupportMessageResponse)
async def get_support_message(
    message_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get a specific support message"""
    from uuid import UUID
    
    message = db.query(SupportMessage).filter(
        SupportMessage.id == UUID(message_id),
        SupportMessage.message_type == "chef"
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Support message not found")
    
    return message


@router.put("/{message_id}", response_model=SupportMessageResponse)
async def update_support_message(
    message_id: str,
    message_update: SupportMessageUpdate,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Update support message (e.g., mark as resolved)"""
    from uuid import UUID
    
    message = db.query(SupportMessage).filter(
        SupportMessage.id == UUID(message_id),
        SupportMessage.message_type == "chef"
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

