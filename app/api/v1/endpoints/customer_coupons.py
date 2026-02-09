"""
Customer coupon endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from typing import List
from app.core.database import get_db
from app.models.coupon import Coupon, CouponUsage
from app.models.order import Order
from app.models.customer import Customer
from app.api.v1.dependencies import get_current_customer
from pydantic import BaseModel

router = APIRouter()


class ValidateCouponRequest(BaseModel):
    code: str
    cart_items: list  # List of {product_id, quantity, price}
    subtotal: float


@router.post("/validate", response_model=dict)
async def validate_coupon(
    request: ValidateCouponRequest,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Validate a coupon code and calculate discount"""
    customer_id = UUID(current_customer["customer_id"])
    
    # Find coupon
    coupon = db.query(Coupon).filter(
        Coupon.code == request.code.upper().strip()
    ).first()
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    now = datetime.utcnow()
    
    # Check if coupon is active
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is not active")
    
    # Check approval status
    if coupon.approval_status != "approved":
        raise HTTPException(status_code=400, detail="Coupon is not approved")
    
    # Check date validity
    if coupon.start_date > now:
        raise HTTPException(status_code=400, detail="Coupon has not started yet")
    
    if coupon.end_date < now:
        raise HTTPException(status_code=400, detail="Coupon has expired")
    
    # Check usage limit
    if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    # Check customer usage limit
    customer_usage_count = db.query(func.count(CouponUsage.id)).filter(
        CouponUsage.coupon_id == coupon.id,
        CouponUsage.customer_id == customer_id
    ).scalar()
    
    if customer_usage_count >= coupon.usage_limit_per_customer:
        raise HTTPException(status_code=400, detail="You have reached the usage limit for this coupon")
    
    # Check first-time customer only
    if coupon.first_time_customer_only:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if customer:
            # Check if customer has any completed orders
            has_orders = db.query(func.count(Order.id)).filter(
                Order.customer_id == customer_id,
                Order.status == "delivered"
            ).scalar() > 0
            
            if has_orders:
                raise HTTPException(status_code=400, detail="This coupon is only for first-time customers")
    
    # Check minimum order amount
    if request.subtotal < float(coupon.minimum_order_amount):
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order amount of ${coupon.minimum_order_amount} required"
        )
    
    # Check minimum items
    total_items = sum(item.get("quantity", 0) for item in request.cart_items)
    if total_items < coupon.minimum_items:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum {coupon.minimum_items} items required"
        )
    
    # Check applicability
    applicable_subtotal = request.subtotal
    
    if coupon.applicable_to == "specific_products":
        # Only apply to specific products
        applicable_subtotal = sum(
            item.get("price", 0) * item.get("quantity", 0)
            for item in request.cart_items
            if str(item.get("product_id")) in (coupon.product_ids or [])
        )
    elif coupon.applicable_to == "specific_categories":
        # Need to check product categories - for now, apply to all items
        # This would require joining with products table
        pass
    elif coupon.applicable_to == "specific_vendors":
        # Need to check product vendors - for now, apply to all items
        # This would require joining with products table
        pass
    
    # Exclude products/categories
    if coupon.exclude_product_ids:
        applicable_subtotal -= sum(
            item.get("price", 0) * item.get("quantity", 0)
            for item in request.cart_items
            if str(item.get("product_id")) in coupon.exclude_product_ids
        )
    
    # Calculate discount
    discount_amount = Decimal("0.00")
    
    if coupon.discount_type == "percentage":
        discount = applicable_subtotal * (Decimal(str(coupon.discount_value)) / Decimal("100"))
        if coupon.max_discount_amount:
            discount = min(discount, Decimal(str(coupon.max_discount_amount)))
        discount_amount = discount
    elif coupon.discount_type == "fixed_amount":
        discount_amount = min(Decimal(str(coupon.discount_value)), Decimal(str(applicable_subtotal)))
    elif coupon.discount_type == "free_shipping":
        discount_amount = Decimal("0.00")  # Will be handled separately in checkout
    
    return {
        "valid": True,
        "coupon_id": str(coupon.id),
        "code": coupon.code,
        "name": coupon.name,
        "discount_type": coupon.discount_type,
        "discount_amount": float(discount_amount),
        "applicable_subtotal": applicable_subtotal,
        "message": "Coupon applied successfully"
    }


@router.get("/my-coupons", response_model=List[dict])
async def get_my_coupons(
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get coupons available to the customer"""
    customer_id = UUID(current_customer["customer_id"])
    now = datetime.utcnow()
    
    # Get active, approved coupons
    coupons = db.query(Coupon).filter(
        Coupon.is_active == True,
        Coupon.approval_status == "approved",
        Coupon.start_date <= now,
        Coupon.end_date >= now
    ).all()
    
    # Filter coupons based on customer eligibility
    available_coupons = []
    
    for coupon in coupons:
        # Check usage limit
        if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
            continue
        
        # Check customer usage limit
        customer_usage_count = db.query(func.count(CouponUsage.id)).filter(
            CouponUsage.coupon_id == coupon.id,
            CouponUsage.customer_id == customer_id
        ).scalar()
        
        if customer_usage_count >= coupon.usage_limit_per_customer:
            continue
        
        # Check first-time customer only
        if coupon.first_time_customer_only:
            has_orders = db.query(func.count(Order.id)).filter(
                Order.customer_id == customer_id,
                Order.status == "delivered"
            ).scalar() > 0
            
            if has_orders:
                continue
        
        # Format discount display
        discount_display = ""
        if coupon.discount_type == "percentage":
            discount_display = f"{int(coupon.discount_value)}% OFF"
            if coupon.max_discount_amount:
                discount_display += f" (up to ${coupon.max_discount_amount})"
        elif coupon.discount_type == "fixed_amount":
            discount_display = f"${coupon.discount_value} OFF"
        elif coupon.discount_type == "free_shipping":
            discount_display = "FREE SHIPPING"
        
        available_coupons.append({
            "id": str(coupon.id),
            "code": coupon.code,
            "name": coupon.name,
            "description": coupon.description,
            "discount_type": coupon.discount_type,
            "discount_display": discount_display,
            "minimum_order_amount": float(coupon.minimum_order_amount) if coupon.minimum_order_amount else 0,
            "minimum_items": coupon.minimum_items,
            "end_date": coupon.end_date.isoformat(),
            "usage_limit_per_customer": coupon.usage_limit_per_customer,
            "customer_usage_count": customer_usage_count
        })
    
    return available_coupons

