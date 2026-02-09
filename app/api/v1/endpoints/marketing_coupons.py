"""
Marketing coupon management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from app.core.database import get_db
from app.models.coupon import Coupon, CouponUsage
from app.models.order import Order
from app.api.v1.dependencies import get_current_admin
from pydantic import BaseModel

router = APIRouter()


class CouponCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    discount_type: str  # percentage, fixed_amount, free_shipping
    discount_value: Optional[float] = None
    max_discount_amount: Optional[float] = None
    start_date: datetime
    end_date: datetime
    usage_limit: Optional[int] = None
    usage_limit_per_customer: int = 1
    minimum_order_amount: float = 0
    minimum_items: int = 0
    applicable_to: str = "all"  # all, specific_products, specific_categories, specific_vendors
    product_ids: Optional[List[str]] = None
    category_ids: Optional[List[str]] = None
    vendor_ids: Optional[List[str]] = None
    exclude_product_ids: Optional[List[str]] = None
    exclude_category_ids: Optional[List[str]] = None
    first_time_customer_only: bool = False


class CouponUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    max_discount_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    usage_limit: Optional[int] = None
    usage_limit_per_customer: Optional[int] = None
    minimum_order_amount: Optional[float] = None
    minimum_items: Optional[int] = None
    applicable_to: Optional[str] = None
    product_ids: Optional[List[str]] = None
    category_ids: Optional[List[str]] = None
    vendor_ids: Optional[List[str]] = None
    exclude_product_ids: Optional[List[str]] = None
    exclude_category_ids: Optional[List[str]] = None
    first_time_customer_only: Optional[bool] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=List[dict])
async def get_coupons(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all coupons"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(Coupon)
    
    if status_filter == "active":
        now = datetime.utcnow()
        query = query.filter(
            Coupon.is_active == True,
            Coupon.start_date <= now,
            Coupon.end_date >= now,
            Coupon.approval_status == "approved"
        )
    elif status_filter == "expired":
        query = query.filter(Coupon.end_date < datetime.utcnow())
    elif status_filter == "pending":
        query = query.filter(Coupon.approval_status == "pending")
    
    coupons = query.order_by(Coupon.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(c.id),
            "code": c.code,
            "name": c.name,
            "description": c.description,
            "discount_type": c.discount_type,
            "discount_value": float(c.discount_value) if c.discount_value else None,
            "max_discount_amount": float(c.max_discount_amount) if c.max_discount_amount else None,
            "start_date": c.start_date.isoformat(),
            "end_date": c.end_date.isoformat(),
            "is_active": c.is_active,
            "usage_limit": c.usage_limit,
            "usage_count": c.usage_count,
            "usage_limit_per_customer": c.usage_limit_per_customer,
            "minimum_order_amount": float(c.minimum_order_amount) if c.minimum_order_amount else 0,
            "minimum_items": c.minimum_items,
            "applicable_to": c.applicable_to,
            "product_ids": c.product_ids or [],
            "category_ids": c.category_ids or [],
            "vendor_ids": c.vendor_ids or [],
            "first_time_customer_only": c.first_time_customer_only,
            "approval_status": c.approval_status,
            "created_at": c.created_at.isoformat(),
            "created_by_type": c.created_by_type
        }
        for c in coupons
    ]


@router.get("/{coupon_id}", response_model=dict)
async def get_coupon(
    coupon_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get coupon details"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    coupon = db.query(Coupon).filter(Coupon.id == UUID(coupon_id)).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    # Get usage statistics
    usage_stats = db.query(
        func.count(CouponUsage.id).label("total_uses"),
        func.sum(CouponUsage.discount_amount).label("total_discount_given")
    ).filter(CouponUsage.coupon_id == coupon.id).first()
    
    return {
        "id": str(coupon.id),
        "code": coupon.code,
        "name": coupon.name,
        "description": coupon.description,
        "discount_type": coupon.discount_type,
        "discount_value": float(coupon.discount_value) if coupon.discount_value else None,
        "max_discount_amount": float(coupon.max_discount_amount) if coupon.max_discount_amount else None,
        "start_date": coupon.start_date.isoformat(),
        "end_date": coupon.end_date.isoformat(),
        "is_active": coupon.is_active,
        "usage_limit": coupon.usage_limit,
        "usage_count": coupon.usage_count,
        "usage_limit_per_customer": coupon.usage_limit_per_customer,
        "minimum_order_amount": float(coupon.minimum_order_amount) if coupon.minimum_order_amount else 0,
        "minimum_items": coupon.minimum_items,
        "applicable_to": coupon.applicable_to,
        "product_ids": coupon.product_ids or [],
        "category_ids": coupon.category_ids or [],
        "vendor_ids": coupon.vendor_ids or [],
        "exclude_product_ids": coupon.exclude_product_ids or [],
        "exclude_category_ids": coupon.exclude_category_ids or [],
        "first_time_customer_only": coupon.first_time_customer_only,
        "approval_status": coupon.approval_status,
        "created_at": coupon.created_at.isoformat(),
        "created_by_type": coupon.created_by_type,
        "statistics": {
            "total_uses": usage_stats.total_uses or 0,
            "total_discount_given": float(usage_stats.total_discount_given) if usage_stats.total_discount_given else 0
        }
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    coupon_data: CouponCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new coupon"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if code already exists
    existing = db.query(Coupon).filter(Coupon.code == coupon_data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    # Validate discount values
    if coupon_data.discount_type == "percentage":
        if not coupon_data.discount_value or coupon_data.discount_value < 0 or coupon_data.discount_value > 100:
            raise HTTPException(status_code=400, detail="Percentage discount must be between 0 and 100")
    elif coupon_data.discount_type == "fixed_amount":
        if not coupon_data.discount_value or coupon_data.discount_value <= 0:
            raise HTTPException(status_code=400, detail="Fixed amount discount must be greater than 0")
    
    # Validate dates
    if coupon_data.end_date <= coupon_data.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    coupon = Coupon(
        code=coupon_data.code.upper().strip(),
        name=coupon_data.name,
        description=coupon_data.description,
        discount_type=coupon_data.discount_type,
        discount_value=Decimal(str(coupon_data.discount_value)) if coupon_data.discount_value else None,
        max_discount_amount=Decimal(str(coupon_data.max_discount_amount)) if coupon_data.max_discount_amount else None,
        start_date=coupon_data.start_date,
        end_date=coupon_data.end_date,
        usage_limit=coupon_data.usage_limit,
        usage_limit_per_customer=coupon_data.usage_limit_per_customer,
        minimum_order_amount=Decimal(str(coupon_data.minimum_order_amount)),
        minimum_items=coupon_data.minimum_items,
        applicable_to=coupon_data.applicable_to,
        product_ids=coupon_data.product_ids,
        category_ids=coupon_data.category_ids,
        vendor_ids=coupon_data.vendor_ids,
        exclude_product_ids=coupon_data.exclude_product_ids,
        exclude_category_ids=coupon_data.exclude_category_ids,
        first_time_customer_only=coupon_data.first_time_customer_only,
        created_by_type="marketing" if admin_role == "marketing" else "admin",
        created_by_id=UUID(current_admin.get("admin_id")),
        approval_status="approved" if admin_role in ["admin", "super_admin"] else "pending"
    )
    
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    
    return {
        "id": str(coupon.id),
        "code": coupon.code,
        "message": "Coupon created successfully"
    }


@router.put("/{coupon_id}", response_model=dict)
async def update_coupon(
    coupon_id: str,
    coupon_data: CouponUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a coupon"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    coupon = db.query(Coupon).filter(Coupon.id == UUID(coupon_id)).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    # Update fields
    if coupon_data.name is not None:
        coupon.name = coupon_data.name
    if coupon_data.description is not None:
        coupon.description = coupon_data.description
    if coupon_data.discount_type is not None:
        coupon.discount_type = coupon_data.discount_type
    if coupon_data.discount_value is not None:
        coupon.discount_value = Decimal(str(coupon_data.discount_value))
    if coupon_data.max_discount_amount is not None:
        coupon.max_discount_amount = Decimal(str(coupon_data.max_discount_amount))
    if coupon_data.start_date is not None:
        coupon.start_date = coupon_data.start_date
    if coupon_data.end_date is not None:
        coupon.end_date = coupon_data.end_date
    if coupon_data.usage_limit is not None:
        coupon.usage_limit = coupon_data.usage_limit
    if coupon_data.usage_limit_per_customer is not None:
        coupon.usage_limit_per_customer = coupon_data.usage_limit_per_customer
    if coupon_data.minimum_order_amount is not None:
        coupon.minimum_order_amount = Decimal(str(coupon_data.minimum_order_amount))
    if coupon_data.minimum_items is not None:
        coupon.minimum_items = coupon_data.minimum_items
    if coupon_data.applicable_to is not None:
        coupon.applicable_to = coupon_data.applicable_to
    if coupon_data.product_ids is not None:
        coupon.product_ids = coupon_data.product_ids
    if coupon_data.category_ids is not None:
        coupon.category_ids = coupon_data.category_ids
    if coupon_data.vendor_ids is not None:
        coupon.vendor_ids = coupon_data.vendor_ids
    if coupon_data.exclude_product_ids is not None:
        coupon.exclude_product_ids = coupon_data.exclude_product_ids
    if coupon_data.exclude_category_ids is not None:
        coupon.exclude_category_ids = coupon_data.exclude_category_ids
    if coupon_data.first_time_customer_only is not None:
        coupon.first_time_customer_only = coupon_data.first_time_customer_only
    if coupon_data.is_active is not None:
        coupon.is_active = coupon_data.is_active
    
    db.commit()
    db.refresh(coupon)
    
    return {"message": "Coupon updated successfully"}


@router.delete("/{coupon_id}", response_model=dict)
async def delete_coupon(
    coupon_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a coupon"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete coupons")
    
    coupon = db.query(Coupon).filter(Coupon.id == UUID(coupon_id)).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    db.delete(coupon)
    db.commit()
    
    return {"message": "Coupon deleted successfully"}


@router.put("/{coupon_id}/approve", response_model=dict)
async def approve_coupon(
    coupon_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve a coupon"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can approve coupons")
    
    coupon = db.query(Coupon).filter(Coupon.id == UUID(coupon_id)).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    coupon.approval_status = "approved"
    coupon.approved_at = datetime.utcnow()
    coupon.approved_by = UUID(current_admin.get("admin_id"))
    coupon.is_active = True
    
    db.commit()
    
    return {"message": "Coupon approved successfully"}


@router.put("/{coupon_id}/reject", response_model=dict)
async def reject_coupon(
    coupon_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reject a coupon"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can reject coupons")
    
    coupon = db.query(Coupon).filter(Coupon.id == UUID(coupon_id)).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    coupon.approval_status = "rejected"
    coupon.is_active = False
    
    db.commit()
    
    return {"message": "Coupon rejected successfully"}


@router.get("/{coupon_id}/usage", response_model=List[dict])
async def get_coupon_usage(
    coupon_id: str,
    skip: int = 0,
    limit: int = 50,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get coupon usage history"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    usages = db.query(CouponUsage).filter(
        CouponUsage.coupon_id == UUID(coupon_id)
    ).order_by(CouponUsage.used_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(u.id),
            "order_id": str(u.order_id),
            "order_number": u.order.order_number if u.order else None,
            "customer_id": str(u.customer_id),
            "discount_amount": float(u.discount_amount),
            "order_total": float(u.order_total),
            "used_at": u.used_at.isoformat()
        }
        for u in usages
    ]

