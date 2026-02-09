"""
Admin promotions management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.models.promotion import Promotion
from app.models.vendor import Vendor
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_promotions(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    vendor_id: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all promotions across the platform"""
    query = db.query(Promotion)
    now = datetime.utcnow()
    
    if status_filter == "active":
        # Active promotions: is_active=True AND not expired
        query = query.filter(
            Promotion.is_active == True,
            Promotion.end_date >= now
        )
    elif status_filter == "inactive":
        # Inactive: either is_active=False OR expired
        query = query.filter(
            or_(
                Promotion.is_active == False,
                Promotion.end_date < now
            )
        )
    elif status_filter == "pending":
        query = query.filter(Promotion.approval_status == "pending")
    elif status_filter == "approved":
        query = query.filter(Promotion.approval_status == "approved")
    elif status_filter == "rejected":
        query = query.filter(Promotion.approval_status == "rejected")
    
    if vendor_id:
        query = query.filter(Promotion.vendor_id == UUID(vendor_id))
    
    promotions = query.order_by(Promotion.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    now = datetime.utcnow()
    
    for promo in promotions:
        vendor = db.query(Vendor).filter(Vendor.id == promo.vendor_id).first()
        
        # Check if promotion has expired based on end_date
        is_expired = promo.end_date < now if promo.end_date else False
        
        result.append({
            "id": str(promo.id),
            "name": promo.name,
            "description": promo.description,
            "promotion_type": promo.promotion_type,
            "discount_type": promo.discount_type,
            "discount_value": float(promo.discount_value) if promo.discount_value else None,
            "vendor_id": str(promo.vendor_id),
            "vendor_name": vendor.business_name if vendor else None,
            "start_date": promo.start_date,
            "end_date": promo.end_date,
            "is_active": promo.is_active and not is_expired,  # Mark as inactive if expired
            "is_expired": is_expired,  # Add explicit expired flag
            "approval_status": promo.approval_status,
            "requires_approval": promo.requires_approval,
            "created_at": promo.created_at
        })
    
    return result


@router.put("/{promotion_id}/approve")
async def approve_promotion(
    promotion_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve a promotion"""
    promotion = db.query(Promotion).filter(Promotion.id == UUID(promotion_id)).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    promotion.approval_status = "approved"
    promotion.approved_at = datetime.utcnow()
    promotion.is_active = True
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="promotion_approved",
        entity_type="promotion",
        entity_id=promotion.id,
        details={"promotion_name": promotion.name}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Promotion approved successfully"}


@router.put("/{promotion_id}/reject")
async def reject_promotion(
    promotion_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reject a promotion"""
    promotion = db.query(Promotion).filter(Promotion.id == UUID(promotion_id)).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    promotion.approval_status = "rejected"
    promotion.is_active = False
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="promotion_rejected",
        entity_type="promotion",
        entity_id=promotion.id,
        details={"promotion_name": promotion.name}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Promotion rejected successfully"}


@router.put("/{promotion_id}/toggle-active")
async def toggle_promotion_active(
    promotion_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle promotion active status"""
    promotion = db.query(Promotion).filter(Promotion.id == UUID(promotion_id)).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    promotion.is_active = not promotion.is_active
    db.commit()
    
    return {"message": f"Promotion {'activated' if promotion.is_active else 'deactivated'} successfully"}


@router.delete("/{promotion_id}")
async def delete_promotion(
    promotion_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a promotion"""
    promotion = db.query(Promotion).filter(Promotion.id == UUID(promotion_id)).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    db.delete(promotion)
    db.commit()
    
    return {"message": "Promotion deleted successfully"}

