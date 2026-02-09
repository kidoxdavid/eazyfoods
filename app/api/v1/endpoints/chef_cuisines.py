"""
Chef cuisine management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.models.cuisine import Cuisine
from app.schemas.cuisine import CuisineCreate, CuisineUpdate, CuisineResponse
from app.api.v1.dependencies import get_current_chef
import re

router = APIRouter()


def generate_slug(name: str, chef_id: str, db: Session) -> str:
    """Generate a unique slug for a cuisine"""
    base_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    slug = base_slug
    counter = 1
    
    while True:
        existing = db.query(Cuisine).filter(
            Cuisine.slug == slug,
            Cuisine.chef_id == UUID(chef_id)
        ).first()
        
        if not existing:
            return slug
        
        slug = f"{base_slug}-{counter}"
        counter += 1


@router.get("", response_model=List[CuisineResponse])
@router.get("/", response_model=List[CuisineResponse])
async def get_cuisines(
    status_filter: Optional[str] = Query(None),
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get all cuisines for current chef"""
    chef_id = UUID(current_chef["chef_id"])
    
    query = db.query(Cuisine).filter(Cuisine.chef_id == chef_id)
    
    if status_filter:
        query = query.filter(Cuisine.status == status_filter)
    
    cuisines = query.order_by(Cuisine.created_at.desc()).all()
    
    result = []
    for cuisine in cuisines:
        cuisine_dict = {
            "id": str(cuisine.id),
            "chef_id": str(cuisine.chef_id),
            "name": cuisine.name,
            "description": cuisine.description,
            "cuisine_type": cuisine.cuisine_type,
            "price": float(cuisine.price) if cuisine.price else None,
            "price_per_person": float(cuisine.price_per_person) if cuisine.price_per_person else None,
            "minimum_servings": cuisine.minimum_servings,
            "image_url": cuisine.image_url,
            "images": cuisine.images or [],
            "ingredients": cuisine.ingredients or [],
            "allergens": cuisine.allergens or [],
            "spice_level": cuisine.spice_level,
            "prep_time_minutes": cuisine.prep_time_minutes,
            "serves": cuisine.serves,
            "is_vegetarian": cuisine.is_vegetarian,
            "is_vegan": cuisine.is_vegan,
            "is_gluten_free": cuisine.is_gluten_free,
            "is_halal": cuisine.is_halal,
            "is_kosher": cuisine.is_kosher,
            "status": cuisine.status,
            "is_featured": cuisine.is_featured,
            "slug": cuisine.slug,
            "created_at": cuisine.created_at.isoformat() if cuisine.created_at else None,
            "updated_at": cuisine.updated_at.isoformat() if cuisine.updated_at else None,
        }
        result.append(cuisine_dict)
    
    return result


@router.get("/{cuisine_id}", response_model=CuisineResponse)
async def get_cuisine(
    cuisine_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get a specific cuisine"""
    chef_id = UUID(current_chef["chef_id"])
    
    cuisine = db.query(Cuisine).filter(
        Cuisine.id == UUID(cuisine_id),
        Cuisine.chef_id == chef_id
    ).first()
    
    if not cuisine:
        raise HTTPException(status_code=404, detail="Cuisine not found")
    
    return {
        "id": str(cuisine.id),
        "chef_id": str(cuisine.chef_id),
        "name": cuisine.name,
        "description": cuisine.description,
        "cuisine_type": cuisine.cuisine_type,
        "price": float(cuisine.price) if cuisine.price else None,
        "price_per_person": float(cuisine.price_per_person) if cuisine.price_per_person else None,
        "minimum_servings": cuisine.minimum_servings,
        "image_url": cuisine.image_url,
        "images": cuisine.images or [],
        "ingredients": cuisine.ingredients or [],
        "allergens": cuisine.allergens or [],
        "spice_level": cuisine.spice_level,
        "prep_time_minutes": cuisine.prep_time_minutes,
        "serves": cuisine.serves,
        "is_vegetarian": cuisine.is_vegetarian,
        "is_vegan": cuisine.is_vegan,
        "is_gluten_free": cuisine.is_gluten_free,
        "is_halal": cuisine.is_halal,
        "is_kosher": cuisine.is_kosher,
        "status": cuisine.status,
        "is_featured": cuisine.is_featured,
        "slug": cuisine.slug,
        "created_at": cuisine.created_at.isoformat() if cuisine.created_at else None,
        "updated_at": cuisine.updated_at.isoformat() if cuisine.updated_at else None,
    }


@router.post("", response_model=CuisineResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=CuisineResponse, status_code=status.HTTP_201_CREATED)
async def create_cuisine(
    cuisine_data: CuisineCreate,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Create a new cuisine"""
    chef_id = UUID(current_chef["chef_id"])
    
    # Generate slug if not provided or ensure uniqueness
    slug = cuisine_data.slug
    if not slug:
        slug = generate_slug(cuisine_data.name, str(chef_id), db)
    else:
        # Check if slug already exists for this chef
        existing = db.query(Cuisine).filter(
            Cuisine.slug == slug,
            Cuisine.chef_id == chef_id
        ).first()
        if existing:
            slug = generate_slug(cuisine_data.name, str(chef_id), db)
    
    cuisine = Cuisine(
        chef_id=chef_id,
        name=cuisine_data.name,
        description=cuisine_data.description,
        cuisine_type=cuisine_data.cuisine_type,
        price=cuisine_data.price,
        price_per_person=cuisine_data.price_per_person,
        minimum_servings=cuisine_data.minimum_servings,
        image_url=cuisine_data.image_url,
        images=cuisine_data.images or [],
        ingredients=cuisine_data.ingredients or [],
        allergens=cuisine_data.allergens or [],
        spice_level=cuisine_data.spice_level,
        prep_time_minutes=cuisine_data.prep_time_minutes,
        serves=cuisine_data.serves,
        is_vegetarian=cuisine_data.is_vegetarian,
        is_vegan=cuisine_data.is_vegan,
        is_gluten_free=cuisine_data.is_gluten_free,
        is_halal=cuisine_data.is_halal,
        is_kosher=cuisine_data.is_kosher,
        status=cuisine_data.status,
        is_featured=cuisine_data.is_featured,
        slug=slug
    )
    
    db.add(cuisine)
    db.commit()
    db.refresh(cuisine)
    
    return {
        "id": str(cuisine.id),
        "chef_id": str(cuisine.chef_id),
        "name": cuisine.name,
        "description": cuisine.description,
        "cuisine_type": cuisine.cuisine_type,
        "price": float(cuisine.price) if cuisine.price else None,
        "price_per_person": float(cuisine.price_per_person) if cuisine.price_per_person else None,
        "minimum_servings": cuisine.minimum_servings,
        "image_url": cuisine.image_url,
        "images": cuisine.images or [],
        "ingredients": cuisine.ingredients or [],
        "allergens": cuisine.allergens or [],
        "spice_level": cuisine.spice_level,
        "prep_time_minutes": cuisine.prep_time_minutes,
        "serves": cuisine.serves,
        "is_vegetarian": cuisine.is_vegetarian,
        "is_vegan": cuisine.is_vegan,
        "is_gluten_free": cuisine.is_gluten_free,
        "is_halal": cuisine.is_halal,
        "is_kosher": cuisine.is_kosher,
        "status": cuisine.status,
        "is_featured": cuisine.is_featured,
        "slug": cuisine.slug,
        "created_at": cuisine.created_at.isoformat() if cuisine.created_at else None,
        "updated_at": cuisine.updated_at.isoformat() if cuisine.updated_at else None,
    }


@router.put("/{cuisine_id}", response_model=CuisineResponse)
async def update_cuisine(
    cuisine_id: str,
    cuisine_update: CuisineUpdate,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Update a cuisine"""
    chef_id = UUID(current_chef["chef_id"])
    
    cuisine = db.query(Cuisine).filter(
        Cuisine.id == UUID(cuisine_id),
        Cuisine.chef_id == chef_id
    ).first()
    
    if not cuisine:
        raise HTTPException(status_code=404, detail="Cuisine not found")
    
    update_data = cuisine_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cuisine, field, value)
    
    db.commit()
    db.refresh(cuisine)
    
    return {
        "id": str(cuisine.id),
        "chef_id": str(cuisine.chef_id),
        "name": cuisine.name,
        "description": cuisine.description,
        "cuisine_type": cuisine.cuisine_type,
        "price": float(cuisine.price) if cuisine.price else None,
        "price_per_person": float(cuisine.price_per_person) if cuisine.price_per_person else None,
        "minimum_servings": cuisine.minimum_servings,
        "image_url": cuisine.image_url,
        "images": cuisine.images or [],
        "ingredients": cuisine.ingredients or [],
        "allergens": cuisine.allergens or [],
        "spice_level": cuisine.spice_level,
        "prep_time_minutes": cuisine.prep_time_minutes,
        "serves": cuisine.serves,
        "is_vegetarian": cuisine.is_vegetarian,
        "is_vegan": cuisine.is_vegan,
        "is_gluten_free": cuisine.is_gluten_free,
        "is_halal": cuisine.is_halal,
        "is_kosher": cuisine.is_kosher,
        "status": cuisine.status,
        "is_featured": cuisine.is_featured,
        "slug": cuisine.slug,
        "created_at": cuisine.created_at.isoformat() if cuisine.created_at else None,
        "updated_at": cuisine.updated_at.isoformat() if cuisine.updated_at else None,
    }


@router.delete("/{cuisine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cuisine(
    cuisine_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Delete a cuisine"""
    chef_id = UUID(current_chef["chef_id"])
    
    cuisine = db.query(Cuisine).filter(
        Cuisine.id == UUID(cuisine_id),
        Cuisine.chef_id == chef_id
    ).first()
    
    if not cuisine:
        raise HTTPException(status_code=404, detail="Cuisine not found")
    
    db.delete(cuisine)
    db.commit()
    
    return None

