"""
Chef portal endpoints - for chefs to manage their profile
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.chef import Chef
from app.schemas.chef import ChefUpdate, ChefResponse
from app.api.v1.dependencies import get_current_chef
from uuid import UUID

router = APIRouter()


def _chef_to_response(chef):
    """Build JSON-serializable dict from Chef ORM (Decimals -> float, UUID -> str)."""
    return ChefResponse(**{
        "id": str(chef.id),
        "email": chef.email,
        "phone": chef.phone,
        "phone_verified": chef.phone_verified or False,
        "first_name": chef.first_name,
        "last_name": chef.last_name,
        "chef_name": chef.chef_name,
        "bio": chef.bio,
        "street_address": chef.street_address,
        "city": chef.city,
        "state": chef.state,
        "postal_code": chef.postal_code,
        "country": chef.country or "Canada",
        "cuisines": chef.cuisines or [],
        "cuisine_description": chef.cuisine_description,
        "profile_image_url": chef.profile_image_url,
        "banner_image_url": chef.banner_image_url,
        "latitude": float(chef.latitude) if chef.latitude else None,
        "longitude": float(chef.longitude) if chef.longitude else None,
        "verification_status": chef.verification_status or "pending",
        "verified_at": chef.verified_at,
        "is_active": chef.is_active if chef.is_active is not None else False,
        "is_available": chef.is_available if chef.is_available is not None else False,
        "service_radius_km": float(chef.service_radius_km) if chef.service_radius_km else None,
        "minimum_order_amount": float(chef.minimum_order_amount) if chef.minimum_order_amount else None,
        "service_fee": float(chef.service_fee) if chef.service_fee else None,
        "estimated_prep_time_minutes": chef.estimated_prep_time_minutes or 60,
        "accepts_online_payment": chef.accepts_online_payment if chef.accepts_online_payment is not None else True,
        "accepts_cash_on_delivery": chef.accepts_cash_on_delivery if chef.accepts_cash_on_delivery is not None else True,
        "social_media_links": chef.social_media_links,
        "website_url": chef.website_url,
        "average_rating": float(chef.average_rating) if chef.average_rating else None,
        "total_reviews": chef.total_reviews or 0,
        "gallery_images": chef.gallery_images or [],
        "created_at": chef.created_at,
        "updated_at": chef.updated_at
    })


@router.get("/profile", response_model=ChefResponse)
async def get_profile(
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get chef profile"""
    try:
        chef = db.query(Chef).filter(Chef.id == UUID(current_chef["chef_id"])).first()
        if not chef:
            raise HTTPException(status_code=404, detail="Chef not found")
        return _chef_to_response(chef)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_profile: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching chef profile: {str(e)}"
        )


@router.put("/profile", response_model=ChefResponse)
async def update_profile(
    chef_update: ChefUpdate,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Update chef profile"""
    chef = db.query(Chef).filter(Chef.id == UUID(current_chef["chef_id"])).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    
    update_data = chef_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(chef, field, value)
    
    db.commit()
    db.refresh(chef)
    return _chef_to_response(chef)


@router.get("/reviews", response_model=List[dict])
async def get_reviews(
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get chef reviews"""
    from app.models.chef import ChefReview
    from app.models.customer import Customer
    
    reviews = db.query(ChefReview).filter(
        ChefReview.chef_id == UUID(current_chef["chef_id"]),
        ChefReview.is_public == True
    ).order_by(ChefReview.created_at.desc()).all()
    
    result = []
    for review in reviews:
        customer = db.query(Customer).filter(Customer.id == review.customer_id).first()
        result.append({
            "id": str(review.id),
            "rating": review.rating,
            "title": review.title,
            "comment": review.comment,
            "cuisine_quality": review.cuisine_quality,
            "service_quality": review.service_quality,
            "value_for_money": review.value_for_money,
            "customer_name": f"{customer.first_name} {customer.last_name}" if customer else "Anonymous",
            "created_at": review.created_at.isoformat(),
            "chef_response": review.chef_response,
            "chef_response_at": review.chef_response_at.isoformat() if review.chef_response_at else None
        })
    
    return result


@router.post("/reviews/{review_id}/respond")
async def respond_to_review(
    review_id: str,
    response: dict,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Respond to a review"""
    from app.models.chef import ChefReview
    from datetime import datetime
    
    review = db.query(ChefReview).filter(
        ChefReview.id == UUID(review_id),
        ChefReview.chef_id == UUID(current_chef["chef_id"])
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    review.chef_response = response.get("response")
    review.chef_response_at = datetime.utcnow()
    
    db.commit()
    return {"message": "Response added successfully"}

