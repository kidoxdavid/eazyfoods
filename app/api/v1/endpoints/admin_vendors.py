"""
Admin vendor management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
# Import Vendor first to ensure relationship resolution
from app.models.vendor import Vendor, VendorUser
from app.models.product import Product
# Import Order after Vendor to ensure relationship works
from app.models.order import Order
from app.models.payout import Payout
from app.api.v1.dependencies import get_current_admin
from app.schemas.vendor import VendorResponse

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_vendors(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all vendors with admin control"""
    query = db.query(Vendor)
    
    if status_filter:
        if status_filter == "active":
            query = query.filter(Vendor.status == "active")
        elif status_filter == "inactive":
            query = query.filter(Vendor.status != "active")
        elif status_filter == "pending":
            query = query.filter(Vendor.verification_status == "pending")
        elif status_filter == "verified":
            query = query.filter(Vendor.verification_status == "verified")
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Vendor.business_name.ilike(search_term),
                Vendor.email.ilike(search_term),
                Vendor.city.ilike(search_term)
            )
        )
    
    vendors = query.order_by(Vendor.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get stats for each vendor
    result = []
    for vendor in vendors:
        try:
            product_count = db.query(func.count(Product.id)).filter(Product.vendor_id == vendor.id).scalar() or 0
            # Use try-except for order queries in case of schema issues
            try:
                order_count = db.query(func.count(Order.id)).filter(Order.vendor_id == vendor.id).scalar() or 0
                total_revenue = db.query(func.sum(Order.total_amount)).filter(
                    Order.vendor_id == vendor.id,
                    Order.status.in_(["delivered", "picked_up"])
                ).scalar() or 0
            except Exception as order_error:
                print(f"Error getting order stats for vendor {vendor.id}: {order_error}")
                order_count = 0
                total_revenue = 0
        except Exception as e:
            import traceback
            print(f"Error getting vendor stats for {vendor.id}: {e}")
            traceback.print_exc()
            product_count = 0
            order_count = 0
            total_revenue = 0
        
        result.append({
            "id": str(vendor.id),
            "business_name": vendor.business_name,
            "email": vendor.email,
            "phone": vendor.phone,
            "city": vendor.city,
            "state": vendor.state,
            "is_active": vendor.status == "active",
            "status": vendor.status,
            "verification_status": vendor.verification_status,
            "region": vendor.region,
            "commission_rate": float(vendor.commission_rate) if vendor.commission_rate else None,
            "product_count": product_count,
            "order_count": order_count,
            "total_revenue": float(total_revenue),
            "created_at": vendor.created_at,
            "verified_at": vendor.verified_at
        })
    
    return result


@router.get("/{vendor_id}", response_model=dict)
async def get_vendor_detail(
    vendor_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed vendor information"""
    # Validate UUID format
    try:
        vendor_uuid = UUID(vendor_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vendor ID format: {str(e)}"
        )
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_uuid).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    # Get comprehensive stats
    product_count = db.query(func.count(Product.id)).filter(Product.vendor_id == vendor.id).scalar() or 0
    order_count = db.query(func.count(Order.id)).filter(Order.vendor_id == vendor.id).scalar() or 0
    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.vendor_id == vendor.id,
        Order.status.in_(["delivered", "picked_up"])
    ).scalar() or 0
    
    # Get payout history
    payouts = db.query(Payout).filter(Payout.vendor_id == vendor.id).order_by(Payout.created_at.desc()).limit(10).all()
    
    # Get staff/users
    staff = db.query(VendorUser).filter(VendorUser.vendor_id == vendor.id).all()
    
    return {
        "id": str(vendor.id),
        "business_name": vendor.business_name,
        "email": vendor.email,
        "phone": vendor.phone,
        "business_type": vendor.business_type,
        "street_address": vendor.street_address,
        "city": vendor.city,
        "state": vendor.state,
        "postal_code": vendor.postal_code,
        "region": vendor.region,
        "status": vendor.status,
        "verification_status": vendor.verification_status,
        "verified_at": vendor.verified_at,
        "commission_rate": float(vendor.commission_rate) if vendor.commission_rate else None,
        "product_count": product_count,
        "order_count": order_count,
        "total_revenue": float(total_revenue) if total_revenue else 0,
        "created_at": vendor.created_at,
        "payouts": [
            {
                "id": str(p.id),
                "payout_number": p.payout_number,
                "net_amount": float(p.net_amount),
                "status": p.status,
                "period_start": p.period_start,
                "period_end": p.period_end,
                "created_at": p.created_at
            }
            for p in payouts
        ],
        "staff": [
            {
                "id": str(s.id),
                "email": s.email,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "role": s.role,
                "is_active": s.is_active
            }
            for s in staff
        ]
    }


@router.put("/{vendor_id}/activate")
async def activate_vendor(
    vendor_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activate a vendor"""
    # Validate UUID format
    try:
        vendor_uuid = UUID(vendor_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vendor ID format: {str(e)}"
        )
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_uuid).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    vendor.status = "active"
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="vendor_activated",
        entity_type="vendor",
        entity_id=vendor.id,
        details={"vendor_name": vendor.business_name}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Vendor activated successfully"}


@router.put("/{vendor_id}/deactivate")
async def deactivate_vendor(
    vendor_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deactivate a vendor"""
    # Validate UUID format
    try:
        vendor_uuid = UUID(vendor_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vendor ID format: {str(e)}"
        )
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_uuid).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    vendor.status = "inactive"
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="vendor_deactivated",
        entity_type="vendor",
        entity_id=vendor.id,
        details={"vendor_name": vendor.business_name}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Vendor deactivated successfully"}


@router.put("/{vendor_id}/verify")
async def verify_vendor(
    vendor_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Verify a vendor"""
    # Validate UUID format
    try:
        vendor_uuid = UUID(vendor_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vendor ID format: {str(e)}"
        )
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_uuid).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    vendor.verification_status = "verified"
    vendor.verified_at = datetime.utcnow()
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="vendor_verified",
        entity_type="vendor",
        entity_id=vendor.id,
        details={"vendor_name": vendor.business_name}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Vendor verified successfully"}


@router.put("/{vendor_id}/commission")
async def update_vendor_commission(
    vendor_id: str,
    commission_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update vendor commission rate"""
    # Validate UUID format
    try:
        vendor_uuid = UUID(vendor_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vendor ID format: {str(e)}"
        )
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_uuid).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    commission_rate = commission_data.get("commission_rate")
    if commission_rate is not None:
        vendor.commission_rate = commission_rate
        db.commit()
        
        # Log activity
        from app.models.admin import AdminActivityLog
        log = AdminActivityLog(
            admin_id=UUID(current_admin["admin_id"]),
            action="vendor_commission_updated",
            entity_type="vendor",
            entity_id=vendor.id,
            details={
                "vendor_name": vendor.business_name,
                "old_commission": float(vendor.commission_rate) if vendor.commission_rate else None,
                "new_commission": commission_rate
            }
        )
        db.add(log)
        db.commit()
    
    return {"message": "Commission rate updated successfully"}


@router.get("/{vendor_id}/payouts")
async def get_vendor_payouts(
    vendor_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get vendor payout history"""
    # Validate UUID format
    try:
        vendor_uuid = UUID(vendor_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vendor ID format: {str(e)}"
        )
    
    payouts = db.query(Payout).filter(Payout.vendor_id == vendor_uuid).order_by(Payout.created_at.desc()).all()
    
    return [
        {
            "id": str(p.id),
            "payout_number": p.payout_number,
            "gross_amount": float(p.gross_amount),
            "commission_amount": float(p.commission_amount),
            "net_amount": float(p.net_amount),
            "status": p.status,
            "period_start": p.period_start,
            "period_end": p.period_end,
            "created_at": p.created_at,
            "processed_at": p.processed_at,
            "completed_at": p.completed_at
        }
        for p in payouts
    ]


@router.put("/{vendor_id}")
async def update_vendor(
    vendor_id: str,
    vendor_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update vendor information"""
    # Validate UUID format
    try:
        vendor_uuid = UUID(vendor_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vendor ID format: {str(e)}"
        )
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_uuid).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    # Update allowed fields
    allowed_fields = ["business_name", "phone", "street_address", "city", "state", "postal_code", "region", "description"]
    for field, value in vendor_data.items():
        if field in allowed_fields and hasattr(vendor, field):
            setattr(vendor, field, value)
    
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="vendor_updated",
        entity_type="vendor",
        entity_id=vendor.id,
        details={"changes": vendor_data, "vendor_name": vendor.business_name}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Vendor updated successfully"}
