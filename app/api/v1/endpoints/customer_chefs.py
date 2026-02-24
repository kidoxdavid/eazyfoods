"""
Customer-facing chef endpoints - browse verified chefs
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import Optional, List
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
from app.core.database import get_db
from app.models.chef import Chef
from app.models.customer import CustomerSavedChef
from app.api.v1.dependencies import get_optional_customer
from uuid import UUID

router = APIRouter()


def _haversine_km(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None
    try:
        R = 6371
        lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return round(R * c, 1)
    except (TypeError, ValueError):
        return None


@router.get("/chefs/cuisines", response_model=dict)
async def get_chef_cuisine_types(
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List cuisine type strings that have at least one verified chef (for filter dropdown)."""
    query = db.query(Chef).filter(
        Chef.verification_status == "verified",
        Chef.is_active == True,
        Chef.is_available == True
    )
    if city and city.strip() and city.strip().lower() != "all":
        query = query.filter(func.lower(Chef.city).ilike(f"%{city.strip().lower()}%"))
    chefs = query.all()
    cuisines = set()
    for c in chefs:
        if c.cuisines:
            for cu in c.cuisines:
                if cu:
                    cuisines.add(cu)
    return {"cuisines": sorted(cuisines)}


@router.get("/chefs", response_model=dict)
async def get_chefs(
    city: Optional[str] = Query(None),
    cuisine: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    sort: Optional[str] = Query("rating", description="rating, reviews, min_order"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    saved_only: Optional[bool] = Query(False),
    current_customer: Optional[dict] = Depends(get_optional_customer),
    db: Session = Depends(get_db)
):
    """Get verified chefs for customers to browse. sort: rating, reviews, min_order."""
    query = db.query(Chef).filter(
        Chef.verification_status == "verified",
        Chef.is_active == True,
        Chef.is_available == True
    )
    if saved_only and current_customer:
        saved_ids = db.query(CustomerSavedChef.chef_id).filter(
            CustomerSavedChef.customer_id == UUID(current_customer["customer_id"])
        ).all()
        if saved_ids:
            query = query.filter(Chef.id.in_([s[0] for s in saved_ids]))
        else:
            query = query.filter(Chef.id.in_([]))  # no results
    if city and city.strip() and city.strip().lower() != 'all':
        query = query.filter(func.lower(Chef.city).ilike(f"%{city.strip().lower()}%"))
    if cuisine and cuisine.strip():
        query = query.filter(
            Chef.cuisines.isnot(None),
            Chef.cuisines.contains([cuisine.strip()])
        )
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Chef.chef_name.ilike(search_term),
                Chef.bio.ilike(search_term),
                func.coalesce(func.array_to_string(Chef.cuisines, ','), '').ilike(search_term)
            )
        )
    if min_rating:
        query = query.filter(Chef.average_rating >= min_rating)
    if sort == "reviews":
        query = query.order_by(Chef.total_reviews.desc().nullslast(), Chef.average_rating.desc().nullslast())
    elif sort == "min_order":
        query = query.order_by(Chef.minimum_order_amount.asc().nullslast(), Chef.average_rating.desc().nullslast())
    else:
        query = query.order_by(Chef.average_rating.desc().nullslast(), Chef.total_reviews.desc().nullslast())
    total = query.count()
    chefs = query.offset(skip).limit(limit).all()
    saved_chef_ids = set()
    if current_customer:
        saved = db.query(CustomerSavedChef.chef_id).filter(
            CustomerSavedChef.customer_id == UUID(current_customer["customer_id"])
        ).all()
        saved_chef_ids = {str(s[0]) for s in saved}
    now = datetime.utcnow()
    from app.models.cuisine import Cuisine
    from app.models.promotion import Promotion
    chef_list = []
    for c in chefs:
        featured_cuisine = db.query(Cuisine).filter(
            Cuisine.chef_id == c.id,
            Cuisine.status == "active"
        ).order_by(Cuisine.is_featured.desc(), Cuisine.created_at.desc()).first()
        has_promotion = db.query(Promotion).filter(
            Promotion.chef_id == c.id,
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now
        ).limit(1).first() is not None
        distance_km = _haversine_km(lat, lng, c.latitude, c.longitude) if (lat is not None and lng is not None) else None
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
            "social_media_links": c.social_media_links,
            "is_available": c.is_available if c.is_available is not None else True,
            "has_promotion": has_promotion,
            "distance_km": distance_km,
            "is_saved": str(c.id) in saved_chef_ids,
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
    current_customer: Optional[dict] = Depends(get_optional_customer),
    db: Session = Depends(get_db)
):
    """Get chef details"""
    try:
        chef_uuid = UUID(chef_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Chef not found")
    chef = db.query(Chef).filter(
        Chef.id == chef_uuid,
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
            "created_at": review.created_at.isoformat() if getattr(review, "created_at", None) else None,
            "chef_response": review.chef_response
        })
    
    # Get all cuisines (including out_of_stock) so we can show "Temporarily unavailable"
    cuisines = db.query(Cuisine).filter(Cuisine.chef_id == chef.id).order_by(
        Cuisine.is_featured.desc(), Cuisine.created_at.desc()
    ).all()
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
            "status": cuisine.status or "active",
        })
    # Similar chefs (same city or overlapping cuisines, exclude self)
    similar_query = db.query(Chef).filter(
        Chef.id != chef.id,
        Chef.verification_status == "verified",
        Chef.is_active == True,
        Chef.is_available == True
    )
    sim_conditions = []
    if chef.city and chef.city.strip():
        sim_conditions.append(func.lower(Chef.city) == func.lower(chef.city))
    if chef.cuisines and len(chef.cuisines) > 0:
        sim_conditions.append(Chef.cuisines.overlap(chef.cuisines))
    if sim_conditions:
        similar_query = similar_query.filter(or_(*sim_conditions))
    similar = similar_query.order_by(Chef.average_rating.desc().nullslast()).limit(6).all()
    similar_list = []
    for s in similar:
        similar_list.append({
            "id": str(s.id),
            "chef_name": s.chef_name,
            "profile_image_url": s.profile_image_url,
            "city": s.city,
            "state": s.state,
            "average_rating": float(s.average_rating) if s.average_rating else None,
            "total_reviews": s.total_reviews,
        })
    return {
        "id": str(chef.id),
        "chef_name": chef.chef_name,
        "bio": chef.bio,
        "profile_image_url": chef.profile_image_url,
        "banner_image_url": chef.banner_image_url,
        "cuisines": chef.cuisines,
        "cuisine_offerings": cuisine_list,
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
        "reviews": review_list,
        "operating_hours": getattr(chef, "operating_hours", None),
        "blocked_dates": getattr(chef, "blocked_dates", None) or [],
        "is_available": chef.is_available if chef.is_available is not None else True,
        "phone": chef.phone,
        "accepts_delivery": True,
        "accepts_pickup": True,
        "similar_chefs": similar_list,
        "is_saved": (
            db.query(CustomerSavedChef).filter(
                CustomerSavedChef.customer_id == UUID(current_customer.get("customer_id")),
                CustomerSavedChef.chef_id == chef.id
            ).first() is not None
            if (current_customer and current_customer.get("customer_id"))
            else False
        ),
    }


@router.get("/saved-chefs", response_model=dict)
async def get_saved_chefs(
    current_customer: Optional[dict] = Depends(get_optional_customer),
    db: Session = Depends(get_db)
):
    """List saved chef IDs (and optionally full chef list) for current customer."""
    if not current_customer:
        return {"chef_ids": [], "chefs": []}
    saved = db.query(CustomerSavedChef).filter(
        CustomerSavedChef.customer_id == UUID(current_customer["customer_id"])
    ).all()
    chef_ids = [str(s.chef_id) for s in saved]
    if not chef_ids:
        return {"chef_ids": [], "chefs": []}
    chefs = db.query(Chef).filter(
        Chef.id.in_([UUID(cid) for cid in chef_ids]),
        Chef.verification_status == "verified",
        Chef.is_active == True
    ).all()
    from app.models.cuisine import Cuisine
    chef_list = []
    for c in chefs:
        fc = db.query(Cuisine).filter(
            Cuisine.chef_id == c.id,
            Cuisine.status == "active"
        ).order_by(Cuisine.is_featured.desc()).first()
        chef_list.append({
            "id": str(c.id),
            "chef_name": c.chef_name,
            "profile_image_url": c.profile_image_url,
            "city": c.city,
            "state": c.state,
            "average_rating": float(c.average_rating) if c.average_rating else None,
            "total_reviews": c.total_reviews,
            "minimum_order_amount": float(c.minimum_order_amount) if c.minimum_order_amount else None,
            "featured_cuisine_name": fc.name if fc else None,
        })
    return {"chef_ids": chef_ids, "chefs": chef_list}


@router.post("/saved-chefs/{chef_id}")
async def save_chef(
    chef_id: str,
    current_customer: Optional[dict] = Depends(get_optional_customer),
    db: Session = Depends(get_db)
):
    """Save a chef to favorites. Requires auth."""
    if not current_customer:
        raise HTTPException(status_code=401, detail="Login to save chefs")
    chef = db.query(Chef).filter(Chef.id == UUID(chef_id)).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    existing = db.query(CustomerSavedChef).filter(
        CustomerSavedChef.customer_id == UUID(current_customer["customer_id"]),
        CustomerSavedChef.chef_id == UUID(chef_id)
    ).first()
    if existing:
        return {"message": "Already saved", "saved": True}
    db.add(CustomerSavedChef(customer_id=UUID(current_customer["customer_id"]), chef_id=UUID(chef_id)))
    db.commit()
    return {"message": "Chef saved", "saved": True}


@router.delete("/saved-chefs/{chef_id}")
async def unsave_chef(
    chef_id: str,
    current_customer: Optional[dict] = Depends(get_optional_customer),
    db: Session = Depends(get_db)
):
    """Remove a chef from favorites."""
    if not current_customer:
        raise HTTPException(status_code=401, detail="Login to manage saved chefs")
    db.query(CustomerSavedChef).filter(
        CustomerSavedChef.customer_id == UUID(current_customer["customer_id"]),
        CustomerSavedChef.chef_id == UUID(chef_id)
    ).delete()
    db.commit()
    return {"message": "Removed", "saved": False}


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

