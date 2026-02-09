"""
Admin review management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.models.review import Review
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.product import Product
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_reviews(
    skip: int = 0,
    limit: int = 50,
    rating_filter: Optional[int] = None,
    vendor_id: Optional[str] = None,
    status_filter: Optional[str] = None,  # all, reported, abusive
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all reviews across the platform"""
    query = db.query(Review)
    
    if rating_filter:
        query = query.filter(Review.rating == rating_filter)
    
    if vendor_id:
        query = query.filter(Review.vendor_id == UUID(vendor_id))
    
    if status_filter == "reported":
        query = query.filter(Review.is_reported == True)
    elif status_filter == "abusive":
        query = query.filter(Review.is_abusive == True)
    
    reviews = query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for review in reviews:
        vendor = db.query(Vendor).filter(Vendor.id == review.vendor_id).first()
        customer = db.query(Customer).filter(Customer.id == review.customer_id).first() if review.customer_id else None
        product = db.query(Product).filter(Product.id == review.product_id).first() if review.product_id else None
        
        result.append({
            "id": str(review.id),
            "rating": review.rating,
            "title": review.title,
            "comment": review.comment,
            "vendor_id": str(review.vendor_id),
            "vendor_name": vendor.business_name if vendor else None,
            "customer_id": str(review.customer_id) if review.customer_id else None,
            "customer_name": f"{customer.first_name} {customer.last_name}" if customer else None,
            "product_id": str(review.product_id) if review.product_id else None,
            "product_name": product.name if product else None,
            "is_verified_purchase": review.is_verified_purchase,
            "is_public": review.is_public,
            "vendor_response": review.vendor_response,
            "is_reported": review.is_reported,
            "is_abusive": review.is_abusive,
            "created_at": review.created_at
        })
    
    return result


@router.get("/stats")
async def get_review_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get review statistics"""
    total_reviews = db.query(func.count(Review.id)).scalar() or 0
    avg_rating = db.query(func.avg(Review.rating)).scalar() or 0
    reported_reviews = db.query(func.count(Review.id)).filter(Review.is_reported == True).scalar() or 0
    abusive_reviews = db.query(func.count(Review.id)).filter(Review.is_abusive == True).scalar() or 0
    
    rating_distribution = db.query(
        Review.rating,
        func.count(Review.id).label('count')
    ).group_by(Review.rating).all()
    
    return {
        "total_reviews": total_reviews,
        "average_rating": float(avg_rating) if avg_rating else 0,
        "reported_reviews": reported_reviews,
        "abusive_reviews": abusive_reviews,
        "rating_distribution": {
            str(rating): count for rating, count in rating_distribution
        }
    }


@router.put("/{review_id}/moderate")
async def moderate_review(
    review_id: str,
    action_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    action = action_data.get("action")
    """Moderate a review"""
    review = db.query(Review).filter(Review.id == UUID(review_id)).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if action == "approve":
        review.is_public = True
        review.is_reported = False
        review.is_abusive = False
    elif action == "reject":
        review.is_public = False
    elif action == "mark_abusive":
        review.is_abusive = True
        review.is_public = False
    elif action == "remove_abusive":
        review.is_abusive = False
        review.is_public = True
    
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="review_moderated",
        entity_type="review",
        entity_id=review.id,
        details={"action": action, "review_id": str(review.id)}
    )
    db.add(log)
    db.commit()
    
    return {"message": f"Review {action}ed successfully"}


@router.delete("/{review_id}")
async def delete_review(
    review_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a review"""
    review = db.query(Review).filter(Review.id == UUID(review_id)).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    db.delete(review)
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="review_deleted",
        entity_type="review",
        entity_id=UUID(review_id),
        details={"review_id": str(review_id)}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Review deleted successfully"}

