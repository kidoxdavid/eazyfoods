"""
Chef promotions endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.promotion import Promotion
from app.models.cuisine import Cuisine
from app.schemas.promotion import PromotionCreate, PromotionUpdate, PromotionResponse
from app.api.v1.dependencies import get_current_chef

router = APIRouter()


@router.get("/", response_model=List[PromotionResponse])
async def get_chef_promotions(
    skip: int = 0,
    limit: int = 50,
    active_only: bool = False,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get all promotions for current chef"""
    from uuid import UUID
    
    chef_id = UUID(current_chef["chef_id"])
    query = db.query(Promotion).filter(
        Promotion.chef_id == chef_id
    )
    
    if active_only:
        now = datetime.utcnow()
        query = query.filter(
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now
        )
    
    promotions = query.order_by(Promotion.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add status field based on dates and is_active, and get affected cuisines
    result = []
    now = datetime.utcnow()
    for promo in promotions:
        # Get cuisines affected by this promotion
        affected_cuisines = []
        if promo.applies_to_all_products:
            # Get all cuisines for this chef
            cuisines = db.query(Cuisine).filter(Cuisine.chef_id == chef_id).all()
            affected_cuisines = [{"id": str(c.id), "name": c.name} for c in cuisines]
        elif promo.cuisine_ids and len(promo.cuisine_ids) > 0:
            cuisines = db.query(Cuisine).filter(Cuisine.id.in_(promo.cuisine_ids)).all()
            affected_cuisines = [{"id": str(c.id), "name": c.name} for c in cuisines]
        
        # Determine status
        start_date = promo.start_date
        end_date = promo.end_date
        is_active_now = promo.is_active and now >= start_date and now <= end_date
        is_upcoming = promo.is_active and now < start_date
        is_expired = now > end_date
        
        status = "active" if is_active_now else ("upcoming" if is_upcoming else ("expired" if is_expired else "inactive"))
        
        promo_dict = {
            "id": str(promo.id),
            "chef_id": str(promo.chef_id) if promo.chef_id else None,
            "name": promo.name,
            "description": promo.description,
            "promotion_type": promo.promotion_type,
            "discount_type": promo.discount_type,
            "discount_value": float(promo.discount_value) if promo.discount_value else None,
            "minimum_order_amount": float(promo.minimum_order_amount) if promo.minimum_order_amount else None,
            "applies_to_all_products": promo.applies_to_all_products,
            "cuisine_ids": [str(cid) for cid in promo.cuisine_ids] if promo.cuisine_ids else [],
            "requires_approval": promo.requires_approval,
            "approval_status": promo.approval_status,
            "start_date": promo.start_date.isoformat() if promo.start_date else None,
            "end_date": promo.end_date.isoformat() if promo.end_date else None,
            "is_active": promo.is_active,
            "status": status,
            "affected_cuisines": affected_cuisines,
            "created_at": promo.created_at.isoformat() if promo.created_at else None,
            "updated_at": promo.updated_at.isoformat() if promo.updated_at else None
        }
        result.append(promo_dict)
    
    return result


@router.post("/", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_chef_promotion(
    promotion_data: PromotionCreate,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Create a new promotion for chef"""
    from uuid import UUID
    
    # Convert cuisine_ids from strings to UUIDs if provided
    cuisine_uuids = None
    if hasattr(promotion_data, 'cuisine_ids') and promotion_data.cuisine_ids and len(promotion_data.cuisine_ids) > 0:
        try:
            cuisine_uuids = [UUID(cid) for cid in promotion_data.cuisine_ids]
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid cuisine ID format: {str(e)}"
            )
    elif hasattr(promotion_data, 'product_ids') and promotion_data.product_ids:
        # If product_ids provided, convert to cuisine_ids (for compatibility)
        try:
            cuisine_uuids = [UUID(pid) for pid in promotion_data.product_ids]
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid ID format: {str(e)}"
            )
    
    promotion = Promotion(
        chef_id=UUID(current_chef["chef_id"]),
        name=promotion_data.name,
        description=promotion_data.description,
        promotion_type=promotion_data.promotion_type,
        discount_type=promotion_data.discount_type,
        discount_value=promotion_data.discount_value,
        minimum_order_amount=promotion_data.minimum_order_amount,
        applies_to_all_products=promotion_data.applies_to_all_products,
        cuisine_ids=cuisine_uuids,
        requires_approval=promotion_data.requires_approval if hasattr(promotion_data, 'requires_approval') else True,
        start_date=promotion_data.start_date,
        end_date=promotion_data.end_date,
        is_active=True
    )
    
    # Auto-approve if requires_approval is False
    if not promotion.requires_approval:
        promotion.approval_status = "approved"
        promotion.approved_at = datetime.utcnow()
    
    try:
        db.add(promotion)
        db.commit()
        db.refresh(promotion)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating promotion: {str(e)}"
        )
    
    return {
        "id": str(promotion.id),
        "chef_id": str(promotion.chef_id) if promotion.chef_id else None,
        "name": promotion.name,
        "description": promotion.description,
        "promotion_type": promotion.promotion_type,
        "discount_type": promotion.discount_type,
        "discount_value": float(promotion.discount_value) if promotion.discount_value else None,
        "minimum_order_amount": float(promotion.minimum_order_amount) if promotion.minimum_order_amount else None,
        "applies_to_all_products": promotion.applies_to_all_products,
        "cuisine_ids": [str(cid) for cid in promotion.cuisine_ids] if promotion.cuisine_ids else [],
        "requires_approval": promotion.requires_approval,
        "approval_status": promotion.approval_status,
        "start_date": promotion.start_date.isoformat() if promotion.start_date else None,
        "end_date": promotion.end_date.isoformat() if promotion.end_date else None,
        "is_active": promotion.is_active,
        "created_at": promotion.created_at.isoformat() if promotion.created_at else None,
        "updated_at": promotion.updated_at.isoformat() if promotion.updated_at else None
    }


@router.put("/{promotion_id}", response_model=PromotionResponse)
async def update_chef_promotion(
    promotion_id: str,
    promotion_update: PromotionUpdate,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Update a promotion"""
    from uuid import UUID
    
    chef_id = UUID(current_chef["chef_id"])
    promotion_id_uuid = UUID(promotion_id)
    
    promotion = db.query(Promotion).filter(
        Promotion.id == promotion_id_uuid,
        Promotion.chef_id == chef_id
    ).first()
    
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion not found"
        )
    
    update_data = promotion_update.dict(exclude_unset=True)
    
    # Handle cuisine_ids if provided
    if 'cuisine_ids' in update_data and update_data['cuisine_ids']:
        try:
            update_data['cuisine_ids'] = [UUID(cid) for cid in update_data['cuisine_ids']]
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid cuisine ID format: {str(e)}"
            )
    elif 'product_ids' in update_data and update_data['product_ids']:
        # For compatibility, convert product_ids to cuisine_ids
        try:
            update_data['cuisine_ids'] = [UUID(pid) for pid in update_data['product_ids']]
            del update_data['product_ids']
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid ID format: {str(e)}"
            )
    
    for field, value in update_data.items():
        setattr(promotion, field, value)
    
    try:
        db.commit()
        db.refresh(promotion)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating promotion: {str(e)}"
        )
    
    return {
        "id": str(promotion.id),
        "chef_id": str(promotion.chef_id) if promotion.chef_id else None,
        "name": promotion.name,
        "description": promotion.description,
        "promotion_type": promotion.promotion_type,
        "discount_type": promotion.discount_type,
        "discount_value": float(promotion.discount_value) if promotion.discount_value else None,
        "minimum_order_amount": float(promotion.minimum_order_amount) if promotion.minimum_order_amount else None,
        "applies_to_all_products": promotion.applies_to_all_products,
        "cuisine_ids": [str(cid) for cid in promotion.cuisine_ids] if promotion.cuisine_ids else [],
        "requires_approval": promotion.requires_approval,
        "approval_status": promotion.approval_status,
        "start_date": promotion.start_date.isoformat() if promotion.start_date else None,
        "end_date": promotion.end_date.isoformat() if promotion.end_date else None,
        "is_active": promotion.is_active,
        "created_at": promotion.created_at.isoformat() if promotion.created_at else None,
        "updated_at": promotion.updated_at.isoformat() if promotion.updated_at else None
    }


@router.delete("/{promotion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chef_promotion(
    promotion_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Delete a promotion"""
    from uuid import UUID
    
    chef_id = UUID(current_chef["chef_id"])
    promotion_id_uuid = UUID(promotion_id)
    
    promotion = db.query(Promotion).filter(
        Promotion.id == promotion_id_uuid,
        Promotion.chef_id == chef_id
    ).first()
    
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion not found"
        )
    
    try:
        db.delete(promotion)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting promotion: {str(e)}"
        )




