"""
Admin support ticket management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.models.support import SupportMessage
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_support_tickets(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    vendor_id: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all support tickets"""
    query = db.query(SupportMessage)
    
    if status_filter:
        query = query.filter(SupportMessage.status == status_filter)
    
    if priority_filter:
        query = query.filter(SupportMessage.priority == priority_filter)
    
    if vendor_id:
        query = query.filter(SupportMessage.vendor_id == UUID(vendor_id))
    
    tickets = query.order_by(SupportMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for ticket in tickets:
        vendor = None
        customer = None
        vendor_name = None
        customer_name = None
        
        if ticket.vendor_id:
            vendor = db.query(Vendor).filter(Vendor.id == ticket.vendor_id).first()
            vendor_name = vendor.business_name if vendor else None
        
        if ticket.customer_id:
            customer = db.query(Customer).filter(Customer.id == ticket.customer_id).first()
            customer_name = f"{customer.first_name} {customer.last_name}" if customer else None
        
        result.append({
            "id": str(ticket.id),
            "subject": ticket.subject,
            "message": ticket.message,
            "status": ticket.status,
            "priority": ticket.priority,
            "message_type": ticket.message_type or "vendor",
            "vendor_id": str(ticket.vendor_id) if ticket.vendor_id else None,
            "vendor_name": vendor_name,
            "customer_id": str(ticket.customer_id) if ticket.customer_id else None,
            "customer_name": customer_name,
            "customer_email": customer.email if customer else None,
            "assigned_to": ticket.assigned_to,
            "created_at": ticket.created_at,
            "updated_at": ticket.updated_at,
            "resolved_at": ticket.resolved_at
        })
    
    return result


@router.get("/stats")
async def get_support_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get support ticket statistics"""
    total = db.query(func.count(SupportMessage.id)).scalar() or 0
    open_tickets = db.query(func.count(SupportMessage.id)).filter(SupportMessage.status == "open").scalar() or 0
    in_progress = db.query(func.count(SupportMessage.id)).filter(SupportMessage.status == "in_progress").scalar() or 0
    resolved = db.query(func.count(SupportMessage.id)).filter(SupportMessage.status == "resolved").scalar() or 0
    
    priority_counts = db.query(
        SupportMessage.priority,
        func.count(SupportMessage.id).label('count')
    ).group_by(SupportMessage.priority).all()
    
    return {
        "total_tickets": total,
        "open_tickets": open_tickets,
        "in_progress": in_progress,
        "resolved_tickets": resolved,
        "priority_breakdown": {
            priority: count for priority, count in priority_counts
        }
    }


@router.get("/{ticket_id}")
async def get_ticket_detail(
    ticket_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get support ticket details"""
    ticket = db.query(SupportMessage).filter(SupportMessage.id == UUID(ticket_id)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    vendor = None
    customer = None
    vendor_name = None
    customer_name = None
    
    if ticket.vendor_id:
        vendor = db.query(Vendor).filter(Vendor.id == ticket.vendor_id).first()
        vendor_name = vendor.business_name if vendor else None
    
    if ticket.customer_id:
        customer = db.query(Customer).filter(Customer.id == ticket.customer_id).first()
        customer_name = f"{customer.first_name} {customer.last_name}" if customer else None
    
    return {
        "id": str(ticket.id),
        "subject": ticket.subject,
        "message": ticket.message,
        "status": ticket.status,
        "priority": ticket.priority,
        "message_type": ticket.message_type or "vendor",
        "vendor_id": str(ticket.vendor_id) if ticket.vendor_id else None,
        "vendor_name": vendor_name,
        "customer_id": str(ticket.customer_id) if ticket.customer_id else None,
        "customer_name": customer_name,
        "customer_email": customer.email if customer else None,
        "assigned_to": ticket.assigned_to,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "resolved_at": ticket.resolved_at
    }


@router.put("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    status_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    status = status_data.get("status")
    """Update support ticket status"""
    ticket = db.query(SupportMessage).filter(SupportMessage.id == UUID(ticket_id)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket.status = status
    if status == "resolved":
        ticket.resolved_at = datetime.utcnow()
    ticket.updated_at = datetime.utcnow()
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="support_ticket_updated",
        entity_type="support",
        entity_id=ticket.id,
        details={"status": status, "ticket_id": str(ticket.id)}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Ticket status updated successfully"}


@router.put("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    assign_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    assigned_to = assign_data.get("assigned_to")
    """Assign support ticket to admin"""
    ticket = db.query(SupportMessage).filter(SupportMessage.id == UUID(ticket_id)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket.assigned_to = assigned_to
    if ticket.status == "open":
        ticket.status = "in_progress"
    ticket.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ticket assigned successfully"}

