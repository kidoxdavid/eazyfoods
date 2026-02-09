"""
Promotions endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.promotion import Promotion
from app.models.product import Product
from app.schemas.promotion import PromotionCreate, PromotionUpdate, PromotionResponse
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.post("/maintenance/revert-expired", response_model=dict)
async def revert_expired_promotions_endpoint(
    db: Session = Depends(get_db)
):
    """Maintenance endpoint to revert prices for expired promotions (can be called by cron job)"""
    try:
        reverted_count = revert_expired_promotions(db)
        return {
            "message": "Expired promotions processed successfully",
            "reverted_count": reverted_count
        }
    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reverting expired promotions: {str(e)}"
        )


@router.get("/", response_model=List[PromotionResponse])
async def get_promotions(
    skip: int = 0,
    limit: int = 50,
    active_only: bool = False,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get all promotions for current vendor"""
    from uuid import UUID
    
    query = db.query(Promotion).filter(
        Promotion.vendor_id == UUID(current_vendor["vendor_id"])
    )
    
    if active_only:
        now = datetime.utcnow()
        query = query.filter(
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now
        )
    
    promotions = query.order_by(Promotion.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add status field based on dates and is_active, and get affected products
    result = []
    now = datetime.utcnow()
    for promo in promotions:
        # Get products affected by this promotion
        affected_products = []
        if promo.applies_to_all_products:
            products = db.query(Product).filter(
                Product.vendor_id == promo.vendor_id,
                Product.status == "active"
            ).limit(10).all()
        elif promo.product_ids:
            from uuid import UUID
            product_uuids = promo.product_ids  # Already UUIDs
            products = db.query(Product).filter(Product.id.in_(product_uuids)).all()
        else:
            products = []
        
        affected_products = [
            {
                "id": str(p.id),
                "name": p.name,
                "price": float(p.price),
                "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None
            }
            for p in products
        ]
        
        # Determine effective approval status - if end_date has passed, mark as expired
        effective_approval_status = promo.approval_status
        if promo.approval_status == "approved" and promo.end_date and now > promo.end_date:
            effective_approval_status = "expired"
        
        promo_dict = {
            "id": str(promo.id),
            "name": promo.name,
            "description": promo.description,
            "promotion_type": promo.promotion_type,
            "discount_type": promo.discount_type,
            "discount_value": float(promo.discount_value) if promo.discount_value else None,
            "applies_to_all_products": promo.applies_to_all_products,
            "product_ids": [str(pid) for pid in promo.product_ids] if promo.product_ids else [],
            "affected_products": affected_products,
            "status": "active" if (promo.is_active and now >= promo.start_date and now <= promo.end_date) else "inactive",
            "approval_status": effective_approval_status,
            "start_date": promo.start_date.isoformat() if promo.start_date else None,
            "end_date": promo.end_date.isoformat() if promo.end_date else None,
            "is_active": promo.is_active,
            "created_at": promo.created_at.isoformat() if promo.created_at else None
        }
        result.append(promo_dict)
    
    return result


@router.post("/", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    promotion_data: PromotionCreate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Create a new promotion"""
    from uuid import UUID
    
    # Convert product_ids from strings to UUIDs if provided
    product_uuids = None
    if promotion_data.product_ids and len(promotion_data.product_ids) > 0:
        try:
            product_uuids = [UUID(pid) for pid in promotion_data.product_ids]
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid product ID format: {str(e)}"
            )
    
    promotion = Promotion(
        vendor_id=UUID(current_vendor["vendor_id"]),
        name=promotion_data.name,
        description=promotion_data.description,
        promotion_type=promotion_data.promotion_type,
        discount_type=promotion_data.discount_type,
        discount_value=promotion_data.discount_value,
        minimum_order_amount=promotion_data.minimum_order_amount,
        applies_to_all_products=promotion_data.applies_to_all_products,
        product_ids=product_uuids,
        requires_approval=promotion_data.requires_approval,
        start_date=promotion_data.start_date,
        end_date=promotion_data.end_date,
        is_active=True
    )
    
    # Auto-approve if requires_approval is False
    if not promotion.requires_approval:
        promotion.approval_status = "approved"
        promotion.approved_at = datetime.utcnow()
        promotion.approved_by = UUID(current_vendor.get("user_id") or current_vendor["vendor_id"])
    
    try:
        db.add(promotion)
        db.commit()
        db.refresh(promotion)
        
        # Apply promotion to products if approved
        if promotion.approval_status == "approved":
            apply_promotion_to_products(promotion, db)
        
        # Return promotion with proper serialization
        now = datetime.utcnow()
        # Convert product_ids UUIDs to strings
        product_ids_str = []
        if promotion.product_ids:
            product_ids_str = [str(pid) for pid in promotion.product_ids]
        
        return {
            "id": str(promotion.id),
            "name": promotion.name,
            "description": promotion.description,
            "promotion_type": promotion.promotion_type,
            "discount_type": promotion.discount_type,
            "discount_value": float(promotion.discount_value) if promotion.discount_value else None,
            "applies_to_all_products": promotion.applies_to_all_products,
            "product_ids": product_ids_str,  # Ensure UUIDs are converted to strings
            "status": "active" if (promotion.is_active and promotion.start_date <= now <= promotion.end_date) else "inactive",
            "approval_status": promotion.approval_status,
            "start_date": promotion.start_date.isoformat() if promotion.start_date else None,
            "end_date": promotion.end_date.isoformat() if promotion.end_date else None,
            "is_active": promotion.is_active,
            "created_at": promotion.created_at.isoformat() if promotion.created_at else None
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create promotion: {str(e)}"
        )


def revert_promotion_prices(promotion, old_product_ids, old_applies_to_all, db):
    """Revert prices for products that were previously affected by this promotion"""
    from uuid import UUID
    from decimal import Decimal
    
    # Get old products that were affected
    if old_applies_to_all:
        old_products = db.query(Product).filter(
            Product.vendor_id == promotion.vendor_id,
            Product.status == "active",
            Product.compare_at_price.isnot(None)  # Only products that have compare_at_price (were discounted)
        ).all()
    elif old_product_ids:
        old_products = db.query(Product).filter(
            Product.id.in_(old_product_ids),
            Product.vendor_id == promotion.vendor_id,
            Product.status == "active",
            Product.compare_at_price.isnot(None)
        ).all()
    else:
        return
    
    # Revert prices: set price back to compare_at_price, clear compare_at_price
    for product in old_products:
        if product.compare_at_price:
            product.price = product.compare_at_price
            product.compare_at_price = None
    
    db.commit()


def revert_expired_promotions(db):
    """Check for expired promotions and revert their prices"""
    from datetime import datetime
    from uuid import UUID
    
    now = datetime.utcnow()
    
    # Find all promotions that have expired (end_date passed) and are approved
    expired_promotions = db.query(Promotion).filter(
        Promotion.end_date < now,
        Promotion.is_active == True,  # Only check active promotions
        Promotion.approval_status == "approved"  # Only revert approved promotions
    ).all()
    
    reverted_count = 0
    for promotion in expired_promotions:
        # Get products that were affected by this promotion
        if promotion.applies_to_all_products:
            products = db.query(Product).filter(
                Product.vendor_id == promotion.vendor_id,
                Product.status == "active",
                Product.compare_at_price.isnot(None)
            ).all()
        elif promotion.product_ids:
            products = db.query(Product).filter(
                Product.id.in_(promotion.product_ids),
                Product.vendor_id == promotion.vendor_id,
                Product.status == "active",
                Product.compare_at_price.isnot(None)
            ).all()
        else:
            continue
        
        # Revert prices for these products
        for product in products:
            if product.compare_at_price:
                product.price = product.compare_at_price
                product.compare_at_price = None
        
        # Mark promotion as inactive
        promotion.is_active = False
        reverted_count += 1
    
    if reverted_count > 0:
        db.commit()
    
    return reverted_count


def apply_promotion_to_products(promotion, db):
    """Apply promotion discount to products"""
    from uuid import UUID
    from decimal import Decimal
    from datetime import datetime
    
    # Only apply if promotion is active, approved, and within date range
    now = datetime.utcnow()
    if not (promotion.is_active and promotion.approval_status == "approved" and now >= promotion.start_date and now <= promotion.end_date):
        return
    
    # Get products to apply promotion to
    if promotion.applies_to_all_products:
        products = db.query(Product).filter(
            Product.vendor_id == promotion.vendor_id,
            Product.status == "active"
        ).all()
    elif promotion.product_ids:
        # product_ids is already an array of UUIDs, use directly
        products = db.query(Product).filter(
            Product.id.in_(promotion.product_ids),
            Product.vendor_id == promotion.vendor_id,
            Product.status == "active"
        ).all()
    else:
        return
    
    # Apply discount to each product
    for product in products:
        # Get the base price (use compare_at_price if exists, otherwise use current price)
        # This handles cases where product was already discounted by another promotion
        base_price = float(product.compare_at_price) if product.compare_at_price else float(product.price)
        
        if promotion.discount_type == "percentage" and promotion.discount_value:
            discount_amount = base_price * (float(promotion.discount_value) / 100)
            new_price = base_price - discount_amount
        elif promotion.discount_type == "fixed_amount" and promotion.discount_value:
            new_price = base_price - float(promotion.discount_value)
        else:
            continue
        
        # Ensure price doesn't go negative
        if new_price < 0:
            new_price = 0
        
        # Update product: set compare_at_price to base price, price to discounted
        # This way customer sees the discount
        if not product.compare_at_price or float(product.compare_at_price) < base_price:
            product.compare_at_price = Decimal(str(base_price))
        
        # Always update price to discounted price
        product.price = Decimal(str(new_price))
    
    db.commit()


@router.get("/{promotion_id}", response_model=PromotionResponse)
async def get_promotion(
    promotion_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get a specific promotion"""
    from uuid import UUID
    
    promotion = db.query(Promotion).filter(
        Promotion.id == UUID(promotion_id),
        Promotion.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    # Return promotion with proper serialization
    now = datetime.utcnow()
    product_ids_str = []
    if promotion.product_ids:
        product_ids_str = [str(pid) if not isinstance(pid, str) else pid for pid in promotion.product_ids]
    
    return {
        "id": str(promotion.id),
        "name": promotion.name,
        "description": promotion.description,
        "promotion_type": promotion.promotion_type,
        "discount_type": promotion.discount_type,
        "discount_value": float(promotion.discount_value) if promotion.discount_value else None,
        "applies_to_all_products": promotion.applies_to_all_products,
        "product_ids": product_ids_str,
        "status": "active" if (promotion.is_active and promotion.start_date <= now <= promotion.end_date) else "inactive",
        "approval_status": promotion.approval_status,
        "start_date": promotion.start_date.isoformat() if promotion.start_date else None,
        "end_date": promotion.end_date.isoformat() if promotion.end_date else None,
        "is_active": promotion.is_active,
        "created_at": promotion.created_at.isoformat() if promotion.created_at else None
    }


@router.put("/{promotion_id}", response_model=PromotionResponse)
async def update_promotion(
    promotion_id: str,
    promotion_update: PromotionUpdate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Update a promotion"""
    from uuid import UUID
    
    promotion = db.query(Promotion).filter(
        Promotion.id == UUID(promotion_id),
        Promotion.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    update_data = promotion_update.dict(exclude_unset=True)
    
    # Store old product_ids to revert prices if needed
    old_product_ids = promotion.product_ids.copy() if promotion.product_ids else []
    old_applies_to_all = promotion.applies_to_all_products
    
    for field, value in update_data.items():
        if field == 'product_ids' and value:
            # Convert product_ids from strings to UUIDs
            from uuid import UUID
            setattr(promotion, field, [UUID(pid) for pid in value])
        else:
            setattr(promotion, field, value)
    
    # Auto-approve if requires_approval is False or if vendor is updating their own promotion
    if not promotion.requires_approval:
        promotion.approval_status = "approved"
        if not promotion.approved_at:
            promotion.approved_at = datetime.utcnow()
            promotion.approved_by = UUID(current_vendor.get("user_id") or current_vendor["vendor_id"])
    
    try:
        db.commit()
        db.refresh(promotion)
        
        # First, revert prices for old products if promotion scope changed
        # Compare UUID lists properly by converting to strings
        old_ids_set = set(str(pid) for pid in old_product_ids) if old_product_ids else set()
        new_ids_set = set(str(pid) for pid in (promotion.product_ids or [])) if promotion.product_ids else set()
        
        scope_changed = (
            old_applies_to_all != promotion.applies_to_all_products or 
            old_ids_set != new_ids_set
        )
        
        if scope_changed:
            revert_promotion_prices(promotion, old_product_ids, old_applies_to_all, db)
        
        # Re-apply promotion to products if it's active and approved
        if promotion.approval_status == "approved":
            apply_promotion_to_products(promotion, db)
        
        # Return promotion with proper serialization
        now = datetime.utcnow()
        product_ids_str = []
        if promotion.product_ids:
            product_ids_str = [str(pid) if not isinstance(pid, str) else pid for pid in promotion.product_ids]
        
        return {
            "id": str(promotion.id),
            "name": promotion.name,
            "description": promotion.description,
            "promotion_type": promotion.promotion_type,
            "discount_type": promotion.discount_type,
            "discount_value": float(promotion.discount_value) if promotion.discount_value else None,
            "applies_to_all_products": promotion.applies_to_all_products,
            "product_ids": product_ids_str,
            "status": "active" if (promotion.is_active and promotion.start_date <= now <= promotion.end_date) else "inactive",
            "approval_status": promotion.approval_status,
            "start_date": promotion.start_date.isoformat() if promotion.start_date else None,
            "end_date": promotion.end_date.isoformat() if promotion.end_date else None,
            "is_active": promotion.is_active,
            "created_at": promotion.created_at.isoformat() if promotion.created_at else None
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update promotion: {str(e)}"
        )


@router.delete("/{promotion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_promotion(
    promotion_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Delete a promotion"""
    from uuid import UUID
    
    promotion = db.query(Promotion).filter(
        Promotion.id == UUID(promotion_id),
        Promotion.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    db.delete(promotion)
    db.commit()
    return None

