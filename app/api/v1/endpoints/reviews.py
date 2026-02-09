"""
Reviews endpoints - vendors can view and respond to customer reviews
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.review import Review
from app.schemas.review import ReviewResponse, ReviewResponseUpdate
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.get("/", response_model=List[ReviewResponse])
async def get_reviews(
    skip: int = 0,
    limit: int = 50,
    rating_filter: int = None,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get all reviews for current vendor's store (including product reviews)"""
    from uuid import UUID
    from app.models.customer import Customer
    from app.models.product import Product
    
    query = db.query(Review).filter(
        Review.vendor_id == UUID(current_vendor["vendor_id"]),
        Review.is_public == True
    )
    
    if rating_filter:
        query = query.filter(Review.rating == rating_filter)
    
    reviews = query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get customer names and product names
    customer_ids = [r.customer_id for r in reviews if r.customer_id]
    product_ids = [r.product_id for r in reviews if r.product_id]
    
    customers = {str(c.id): c for c in db.query(Customer).filter(Customer.id.in_(customer_ids)).all()} if customer_ids else {}
    products = {str(p.id): p for p in db.query(Product).filter(Product.id.in_(product_ids)).all()} if product_ids else {}
    
    reviews_list = []
    for review in reviews:
        customer = customers.get(str(review.customer_id)) if review.customer_id else None
        customer_name = f"{customer.first_name} {customer.last_name}" if customer else "Anonymous"
        
        product = products.get(str(review.product_id)) if review.product_id else None
        product_name = product.name if product else None
        
        reviews_list.append({
            "id": str(review.id),
            "product_id": str(review.product_id) if review.product_id else None,
            "order_id": str(review.order_id) if review.order_id else None,
            "customer_id": str(review.customer_id) if review.customer_id else None,
            "rating": review.rating,
            "title": review.title,
            "comment": review.comment,
            "is_verified_purchase": review.is_verified_purchase,
            "vendor_response": review.vendor_response,
            "vendor_response_at": review.vendor_response_at,
            "created_at": review.created_at,
            "customer_name": customer_name,
            "product_name": product_name  # Add product name for vendor view
        })
    
    return reviews_list


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get a specific review"""
    from uuid import UUID
    
    review = db.query(Review).filter(
        Review.id == UUID(review_id),
        Review.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return review


@router.put("/{review_id}/respond", response_model=ReviewResponse)
async def respond_to_review(
    review_id: str,
    response_data: ReviewResponseUpdate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Respond to a customer review"""
    from uuid import UUID
    from datetime import datetime
    
    review = db.query(Review).filter(
        Review.id == UUID(review_id),
        Review.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    review.vendor_response = response_data.vendor_response
    review.vendor_response_at = datetime.utcnow()
    if current_vendor.get("user_id"):
        review.responded_by = UUID(current_vendor["user_id"])
    
    db.commit()
    db.refresh(review)
    return review


@router.post("/{review_id}/report", response_model=dict)
async def report_review(
    review_id: str,
    reason: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Report an abusive review"""
    from uuid import UUID
    
    review = db.query(Review).filter(
        Review.id == UUID(review_id),
        Review.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    review.is_reported = True
    review.report_reason = reason
    
    db.commit()
    return {"message": "Review reported successfully"}


@router.get("/stats/summary", response_model=dict)
async def get_review_stats(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get review statistics"""
    from uuid import UUID
    from sqlalchemy import func
    
    vendor_id = UUID(current_vendor["vendor_id"])
    
    total_reviews = db.query(func.count(Review.id)).filter(
        Review.vendor_id == vendor_id,
        Review.is_public == True
    ).scalar() or 0
    
    avg_rating = db.query(func.avg(Review.rating)).filter(
        Review.vendor_id == vendor_id,
        Review.is_public == True
    ).scalar() or 0
    
    rating_distribution = {}
    for rating in range(1, 6):
        count = db.query(func.count(Review.id)).filter(
            Review.vendor_id == vendor_id,
            Review.rating == rating,
            Review.is_public == True
        ).scalar() or 0
        rating_distribution[rating] = count
    
    return {
        "total_reviews": total_reviews,
        "average_rating": float(avg_rating) if avg_rating else 0,
        "rating_distribution": rating_distribution
    }

