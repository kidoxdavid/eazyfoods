"""
Customer review endpoints - customers can review products
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.review import Review
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.api.v1.dependencies import get_current_customer
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    order_id: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    product_id: Optional[str]
    customer_id: Optional[str]
    rating: int
    title: Optional[str]
    comment: Optional[str]
    is_verified_purchase: bool
    vendor_response: Optional[str]
    vendor_response_at: Optional[datetime]
    created_at: datetime
    customer_name: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.post("/products/{product_id}", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_product_review(
    product_id: str,
    review_data: ReviewCreate,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Create a review for a product"""
    from uuid import UUID
    
    customer_id = UUID(current_customer["customer_id"])
    product_uuid = UUID(product_id)
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_uuid).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if customer already reviewed this product
    existing_review = db.query(Review).filter(
        Review.product_id == product_uuid,
        Review.customer_id == customer_id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=400,
            detail="You have already reviewed this product"
        )
    
    # Check if this is a verified purchase (customer has ordered this product)
    is_verified = False
    order_uuid = None
    if review_data.order_id:
        try:
            order_uuid = UUID(review_data.order_id)
            order = db.query(Order).filter(
                Order.id == order_uuid,
                Order.customer_id == customer_id
            ).first()
            
            if order:
                # Check if order contains this product
                order_item = db.query(OrderItem).filter(
                    OrderItem.order_id == order_uuid,
                    OrderItem.product_id == product_uuid
                ).first()
                if order_item:
                    is_verified = True
        except ValueError:
            pass
    
    # Create review
    review = Review(
        vendor_id=product.vendor_id,
        product_id=product_uuid,
        customer_id=customer_id,
        order_id=order_uuid,
        rating=review_data.rating,
        title=review_data.title,
        comment=review_data.comment,
        is_verified_purchase=is_verified
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    # Get customer name for response
    from app.models.customer import Customer
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    customer_name = f"{customer.first_name} {customer.last_name}" if customer else None
    
    return {
        "id": str(review.id),
        "product_id": str(review.product_id),
        "customer_id": str(review.customer_id),
        "rating": review.rating,
        "title": review.title,
        "comment": review.comment,
        "is_verified_purchase": review.is_verified_purchase,
        "vendor_response": review.vendor_response,
        "vendor_response_at": review.vendor_response_at,
        "created_at": review.created_at,
        "customer_name": customer_name
    }


@router.get("/products/{product_id}", response_model=List[ReviewResponse])
async def get_product_reviews(
    product_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get all reviews for a product"""
    from uuid import UUID
    
    product_uuid = UUID(product_id)
    
    reviews = db.query(Review).filter(
        Review.product_id == product_uuid,
        Review.is_public == True
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get customer names
    from app.models.customer import Customer
    customer_ids = [r.customer_id for r in reviews if r.customer_id]
    customers = {str(c.id): c for c in db.query(Customer).filter(Customer.id.in_(customer_ids)).all()}
    
    reviews_list = []
    for review in reviews:
        customer = customers.get(str(review.customer_id)) if review.customer_id else None
        customer_name = f"{customer.first_name} {customer.last_name}" if customer else "Anonymous"
        
        reviews_list.append({
            "id": str(review.id),
            "product_id": str(review.product_id),
            "customer_id": str(review.customer_id) if review.customer_id else None,
            "rating": review.rating,
            "title": review.title,
            "comment": review.comment,
            "is_verified_purchase": review.is_verified_purchase,
            "vendor_response": review.vendor_response,
            "vendor_response_at": review.vendor_response_at,
            "created_at": review.created_at,
            "customer_name": customer_name
        })
    
    return reviews_list


@router.get("/my-reviews", response_model=List[ReviewResponse])
async def get_my_reviews(
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get all reviews by current customer"""
    from uuid import UUID
    
    customer_id = UUID(current_customer["customer_id"])
    
    reviews = db.query(Review).filter(
        Review.customer_id == customer_id
    ).order_by(Review.created_at.desc()).all()
    
    reviews_list = []
    for review in reviews:
        reviews_list.append({
            "id": str(review.id),
            "product_id": str(review.product_id) if review.product_id else None,
            "customer_id": str(review.customer_id),
            "rating": review.rating,
            "title": review.title,
            "comment": review.comment,
            "is_verified_purchase": review.is_verified_purchase,
            "vendor_response": review.vendor_response,
            "vendor_response_at": review.vendor_response_at,
            "created_at": review.created_at,
            "customer_name": None  # It's the current customer
        })
    
    return reviews_list

