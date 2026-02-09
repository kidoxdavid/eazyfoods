"""
Admin chef management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.models.chef import Chef
from app.api.v1.dependencies import get_current_admin
from sqlalchemy import or_, func

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_chefs(
    skip: int = 0,
    limit: int = 50,
    verification_status: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all chefs"""
    query = db.query(Chef)
    
    if verification_status:
        query = query.filter(Chef.verification_status == verification_status)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Chef.chef_name.ilike(search_term),
                Chef.first_name.ilike(search_term),
                Chef.last_name.ilike(search_term),
                Chef.email.ilike(search_term),
                Chef.city.ilike(search_term)
            )
        )
    
    chefs = query.order_by(Chef.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(c.id),
            "chef_name": c.chef_name,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "city": c.city,
            "state": c.state,
            "cuisines": c.cuisines or [],
            "verification_status": c.verification_status,
            "is_active": c.is_active,
            "is_available": c.is_available,
            "average_rating": float(c.average_rating) if c.average_rating else None,
            "total_reviews": c.total_reviews,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "verified_at": c.verified_at.isoformat() if c.verified_at else None
        }
        for c in chefs
    ]


@router.get("/{chef_id}", response_model=dict)
async def get_chef(
    chef_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get chef details"""
    chef = db.query(Chef).filter(Chef.id == UUID(chef_id)).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    
    # Get reviews count
    from app.models.chef import ChefReview
    reviews_count = db.query(ChefReview).filter(ChefReview.chef_id == chef.id).count()
    
    return {
        "id": str(chef.id),
        "chef_name": chef.chef_name,
        "first_name": chef.first_name,
        "last_name": chef.last_name,
        "email": chef.email,
        "phone": chef.phone,
        "bio": chef.bio,
        "street_address": chef.street_address,
        "city": chef.city,
        "state": chef.state,
        "postal_code": chef.postal_code,
        "country": chef.country,
        "cuisines": chef.cuisines or [],
        "cuisine_description": chef.cuisine_description,
        "profile_image_url": chef.profile_image_url,
        "banner_image_url": chef.banner_image_url,
        "verification_status": chef.verification_status,
        "verification_notes": chef.verification_notes,
        "is_active": chef.is_active,
        "is_available": chef.is_available,
        "average_rating": float(chef.average_rating) if chef.average_rating else None,
        "total_reviews": chef.total_reviews,
        "service_radius_km": float(chef.service_radius_km) if chef.service_radius_km else None,
        "gallery_images": chef.gallery_images or [],
        "social_media_links": chef.social_media_links,
        "created_at": chef.created_at.isoformat() if chef.created_at else None,
        "verified_at": chef.verified_at.isoformat() if chef.verified_at else None
    }


@router.put("/{chef_id}/verify", response_model=dict)
async def verify_chef(
    chef_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Verify a chef"""
    from datetime import datetime
    
    chef = db.query(Chef).filter(Chef.id == UUID(chef_id)).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    
    chef.verification_status = "verified"
    chef.verified_at = datetime.utcnow()
    chef.verified_by = UUID(current_admin["admin_id"])
    chef.is_active = True
    
    db.commit()
    db.refresh(chef)
    
    return {"message": "Chef verified successfully", "chef_id": str(chef.id)}


@router.put("/{chef_id}/reject", response_model=dict)
async def reject_chef(
    chef_id: str,
    rejection_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reject a chef application"""
    chef = db.query(Chef).filter(Chef.id == UUID(chef_id)).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    
    chef.verification_status = "rejected"
    chef.verification_notes = rejection_data.get("notes", "")
    chef.is_active = False
    
    db.commit()
    
    return {"message": "Chef application rejected", "chef_id": str(chef.id)}


@router.put("/{chef_id}/suspend", response_model=dict)
async def suspend_chef(
    chef_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Suspend a chef"""
    chef = db.query(Chef).filter(Chef.id == UUID(chef_id)).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    
    chef.verification_status = "suspended"
    chef.is_active = False
    chef.is_available = False
    
    db.commit()
    
    return {"message": "Chef suspended successfully", "chef_id": str(chef.id)}


@router.put("/{chef_id}/activate", response_model=dict)
async def activate_chef(
    chef_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activate a chef"""
    chef = db.query(Chef).filter(Chef.id == UUID(chef_id)).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    
    chef.is_active = True
    
    db.commit()
    
    return {"message": "Chef activated successfully", "chef_id": str(chef.id)}


@router.put("/{chef_id}/deactivate", response_model=dict)
async def deactivate_chef(
    chef_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deactivate a chef"""
    chef = db.query(Chef).filter(Chef.id == UUID(chef_id)).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    
    chef.is_active = False
    chef.is_available = False
    
    db.commit()
    
    return {"message": "Chef deactivated successfully", "chef_id": str(chef.id)}

