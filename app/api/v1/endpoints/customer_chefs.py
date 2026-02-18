"""
Customer-facing chef endpoints - browse verified chefs
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.models.chef import Chef
from app.schemas.chef import ChefResponse
from sqlalchemy import func, or_

from uuid import UUID

router = APIRouter()


@router.get("/chefs", response_model=dict)
async def get_chefs(
    city: Optional[str] = Query(None),
    cuisine: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get verified chefs for customers to browse"""
    query = db.query(Chef).filter(
        Chef.verification_status == "verified",
        Chef.is_active == True,
        Chef.is_available == True
    )
    
    # Filter by city
    if city and city.strip() and city.strip().lower() != 'all':
        query = query.filter(func.lower(Chef.city).ilike(f"%{city.strip().lower()}%"))
    
    # Filter by cuisine
    if cuisine:
        query = query.filter(Chef.cuisines.contains([cuisine]))
    
    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Chef.chef_name.ilike(search_term),
                Chef.bio.ilike(search_term),
                func.array_to_string(Chef.cuisines, ',').ilike(search_term)
            )
        )
    
    # Filter by minimum rating
    if min_rating:
        query = query.filter(Chef.average_rating >= min_rating)
    
    total = query.count()
    chefs = query.order_by(Chef.average_rating.desc(), Chef.total_reviews.desc()).offset(skip).limit(limit).all()
    
    # Get featured cuisine for each chef
    from app.models.cuisine import Cuisine
    chef_list = []
    for c in chefs:
        # Get featured cuisine or first active cuisine
        featured_cuisine = db.query(Cuisine).filter(
            Cuisine.chef_id == c.id,
            Cuisine.status == "active"
        ).order_by(Cuisine.is_featured.desc(), Cuisine.created_at.desc()).first()
        
        chef_dict = {
            "id": str(c.id),
            "chef_name": c.chef_name,
            "bio": c.bio,
            "profile_image_url": c.profile_image_url,
            "banner_image_url": c.banner_image_url,
            "cuisines": c.cuisines,
            "cuisine_description": c.cuisine_description,
            "featured_cuisine_name": featured_cuisine.name if featured_cuisine else None,
            "city": c.city,
            "state": c.state,
            "average_rating": float(c.average_rating) if c.average_rating else None,
            "total_reviews": c.total_reviews,
            "service_radius_km": float(c.service_radius_km) if c.service_radius_km else None,
            "minimum_order_amount": float(c.minimum_order_amount) if c.minimum_order_amount else None,
            "gallery_images": c.gallery_images or [],
            "social_media_links": c.social_media_links
        }
        chef_list.append(chef_dict)
    
    return {
        "chefs": chef_list,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/chefs/{chef_id}", response_model=dict)
async def get_chef(
    chef_id: str,
    db: Session = Depends(get_db)
):
    """Get chef details"""
    chef = db.query(Chef).filter(
        Chef.id == UUID(chef_id),
        Chef.verification_status == "verified",
        Chef.is_active == True
    ).first()
    
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    
    # Get reviews
    from app.models.chef import ChefReview
    from app.models.customer import Customer
    from app.models.cuisine import Cuisine
    
    reviews = db.query(ChefReview).filter(
        ChefReview.chef_id == chef.id,
        ChefReview.is_public == True
    ).order_by(ChefReview.created_at.desc()).limit(10).all()
    
    review_list = []
    for review in reviews:
        customer = db.query(Customer).filter(Customer.id == review.customer_id).first()
        review_list.append({
            "id": str(review.id),
            "rating": review.rating,
            "title": review.title,
            "comment": review.comment,
            "cuisine_quality": review.cuisine_quality,
            "service_quality": review.service_quality,
            "value_for_money": review.value_for_money,
            "customer_name": f"{customer.first_name} {customer.last_name}" if customer else "Anonymous",
            "created_at": review.created_at.isoformat(),
            "chef_response": review.chef_response
        })
    
    # Get cuisines
    cuisines = db.query(Cuisine).filter(
        Cuisine.chef_id == chef.id,
        Cuisine.status == "active"
    ).order_by(Cuisine.is_featured.desc(), Cuisine.created_at.desc()).all()
    
    cuisine_list = []
    for cuisine in cuisines:
        cuisine_list.append({
            "id": str(cuisine.id),
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
            "is_featured": cuisine.is_featured,
            "slug": cuisine.slug,
        })
    
    return {
        "id": str(chef.id),
        "chef_name": chef.chef_name,
        "bio": chef.bio,
        "profile_image_url": chef.profile_image_url,
        "banner_image_url": chef.banner_image_url,
        "cuisines": chef.cuisines,  # Array of cuisine types (e.g., ["Nigerian", "Ghanaian"])
        "cuisine_offerings": cuisine_list,  # List of actual cuisine dishes/items
        "cuisine_description": chef.cuisine_description,
        "city": chef.city,
        "state": chef.state,
        "street_address": chef.street_address,
        "postal_code": chef.postal_code,
        "average_rating": float(chef.average_rating) if chef.average_rating else None,
        "total_reviews": chef.total_reviews,
        "service_radius_km": float(chef.service_radius_km) if chef.service_radius_km else None,
        "minimum_order_amount": float(chef.minimum_order_amount) if chef.minimum_order_amount else None,
        "service_fee": float(chef.service_fee) if chef.service_fee else None,
        "estimated_prep_time_minutes": chef.estimated_prep_time_minutes,
        "gallery_images": chef.gallery_images or [],
        "social_media_links": chef.social_media_links,
        "website_url": chef.website_url,
        "reviews": review_list
    }


@router.get("/chef-cuisines-deals", response_model=dict)
async def get_chef_cuisines_deals(
    city: Optional[str] = Query(None),
    cuisine_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get chef cuisines (dishes) that have active promotions - for Top Chef Deals page"""
    from app.models.cuisine import Cuisine
    from app.models.promotion import Promotion
    from datetime import datetime
    from app.core.config import resolve_upload_url

    now = datetime.utcnow()
    # Get active chef promotions
    promo_query = db.query(Promotion).join(Chef, Promotion.chef_id == Chef.id).filter(
        Promotion.is_active == True,
        Promotion.start_date <= now,
        Promotion.end_date >= now,
        Promotion.chef_id.isnot(None),
        Chef.verification_status == "verified",
        Chef.is_active == True
    )
    if city and city.strip().lower() != "all":
        promo_query = promo_query.filter(
            Chef.city.isnot(None),
            func.lower(Chef.city).ilike(f"%{city.strip().lower()}%")
        )
    promos = promo_query.all()

    # Collect cuisine IDs from promotions (applies_to_all or cuisine_ids)
    # For chef promos: applies_to_all_products means all cuisines; empty cuisine_ids also means all
    cuisine_ids = set()
    chef_promo_map = {}  # cuisine_id -> [promos]
    for p in promos:
        applies_to_all = p.applies_to_all_products or not (p.cuisine_ids and len(p.cuisine_ids) > 0)
        if applies_to_all:
            # Get all cuisines for this chef
            cuisines = db.query(Cuisine.id).filter(
                Cuisine.chef_id == p.chef_id,
                Cuisine.status == "active"
            ).all()
            for c in cuisines:
                cid = str(c.id)
                cuisine_ids.add(cid)
                if cid not in chef_promo_map:
                    chef_promo_map[cid] = []
                chef_promo_map[cid].append(p)
        elif p.cuisine_ids:
            for cid in p.cuisine_ids:
                cid_str = str(cid)
                cuisine_ids.add(cid_str)
                if cid_str not in chef_promo_map:
                    chef_promo_map[cid_str] = []
                chef_promo_map[cid_str].append(p)

    if not cuisine_ids:
        return {"cuisines": [], "total": 0}

    # Fetch cuisines
    cuisine_objs = db.query(Cuisine).filter(
        Cuisine.id.in_([UUID(cid) for cid in cuisine_ids]),
        Cuisine.status == "active"
    ).all()

    # Build result with chef info
    result = []
    for c in cuisine_objs:
        chef = db.query(Chef).filter(Chef.id == c.chef_id).first()
        if not chef:
            continue
        promos_for_c = chef_promo_map.get(str(c.id), [])
        if not promos_for_c:
            continue

        # Filter by cuisine_type
        if cuisine_type and cuisine_type.strip():
            ctype = (c.cuisine_type or "").lower()
            if cuisine_type.strip().lower() not in ctype and cuisine_type.strip().lower() not in (c.name or "").lower():
                continue

        # Filter by search
        if search and search.strip():
            term = search.strip().lower()
            if term not in (c.name or "").lower() and term not in (c.description or "").lower() and term not in (c.cuisine_type or "").lower():
                if term not in (chef.chef_name or "").lower():
                    continue

        # Build promo list for this cuisine
        promo_list = []
        for promo in promos_for_c:
            discount_display = ""
            if promo.discount_type == "percentage" and promo.discount_value:
                discount_display = f"{int(promo.discount_value)}% OFF"
            elif promo.discount_type == "fixed_amount" and promo.discount_value:
                discount_display = f"${float(promo.discount_value):.2f} OFF"
            promo_list.append({
                "id": str(promo.id),
                "name": promo.name or "Special Offer",
                "discount_type": promo.discount_type,
                "discount_value": float(promo.discount_value) if promo.discount_value else None,
                "discount_display": discount_display
            })

        price = float(c.price) if c.price else 0
        # Apply first promo for display price
        discounted_price = price
        if promo_list and promo_list[0].get("discount_type") == "percentage" and promo_list[0].get("discount_value"):
            discounted_price = price * (1 - promo_list[0]["discount_value"] / 100)
        elif promo_list and promo_list[0].get("discount_type") == "fixed_amount" and promo_list[0].get("discount_value"):
            discounted_price = max(0, price - promo_list[0]["discount_value"])

        result.append({
            "id": str(c.id),
            "name": c.name,
            "description": c.description,
            "cuisine_type": c.cuisine_type,
            "price": price,
            "discounted_price": round(discounted_price, 2),
            "image_url": resolve_upload_url(c.image_url),
            "images": [resolve_upload_url(u) for u in (c.images or []) if u],
            "serves": c.serves,
            "chef_id": str(chef.id),
            "chef_name": chef.chef_name or f"{chef.first_name} {chef.last_name}",
            "chef_profile_image_url": chef.profile_image_url,
            "promotions": promo_list,
            "average_rating": float(chef.average_rating) if chef.average_rating else None,
            "total_reviews": chef.total_reviews or 0
        })

    # Sort by discount
    result.sort(key=lambda x: (x["price"] - x["discounted_price"]), reverse=True)
    return {"cuisines": result[:limit], "total": len(result)}


# Note: Review creation should be handled in customer_reviews.py with proper auth
# This endpoint is kept here for reference but should be moved to customer_reviews.py

