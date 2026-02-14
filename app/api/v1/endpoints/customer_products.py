"""
Customer-facing product endpoints
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from app.core.database import get_db
from app.core.config import resolve_upload_url, resolve_upload_urls
# Import Vendor FIRST to ensure it's available when Product relationships are initialized
from app.models.vendor import Vendor
from app.models.product import Product, Category
from app.models.store import Store
from sqlalchemy import or_, and_, func, text, distinct

router = APIRouter()


@router.get("/categories")
async def get_categories(
    db: Session = Depends(get_db)
):
    """Get all categories (uses app DB so Render DATABASE_URL works)."""
    from sqlalchemy import text
    try:
        result = db.execute(text("""
            SELECT id, name, slug, description, image_url
            FROM categories
            WHERE is_active = true
            ORDER BY name
        """))
        rows = result.fetchall()
        categories_list = []
        for row in rows:
            try:
                cat_id = str(row[0]) if row[0] else None
                categories_list.append({
                    "id": cat_id,
                    "category_id": cat_id,
                    "name": row[1] if row[1] else "",
                    "category_name": row[1] if row[1] else "",
                    "slug": row[2] if row[2] else "",
                    "description": row[3] if row[3] else "",
                    "image_url": row[4] if row[4] else None
                })
            except Exception:
                continue
        return categories_list
    except Exception as e:
        import traceback
        print(f"ERROR fetching categories: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")


@router.get("/products", response_model=dict)
async def get_products(
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    vendor_id: Optional[str] = Query(None),
    featured: Optional[bool] = Query(None),
    new_arrivals: Optional[bool] = Query(None),
    discounted: Optional[bool] = Query(None),
    low_stock: Optional[bool] = Query(None),
    city: Optional[str] = Query(None, description="Filter by city (e.g., Calgary, Edmonton). Use 'All' to show all cities."),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get products for customers (only active products from active vendors)"""
    # Check and revert expired promotions before fetching products
    try:
        from app.api.v1.endpoints.promotions import revert_expired_promotions
        revert_expired_promotions(db)
    except Exception as e:
        # Log error but don't fail the request
        print(f"Warning: Error reverting expired promotions: {str(e)}")
    from uuid import UUID
    
    try:
        # Base query: all active products from active vendors
        query = db.query(Product).join(
            Vendor, Product.vendor_id == Vendor.id
        ).filter(
            Product.status == "active",
            Vendor.status == "active"
        )
        
        # Filter by city if provided (and not "All")
        # BUT: Don't apply city filter if vendor_id is specified (viewing a specific store)
        # Also skip if city is empty string or just whitespace
        # When city is None, empty, or "All", show ALL products (no city filtering)
        city_filter_applied = False
        
        # Normalize city parameter: handle None, empty string, "All", "all", etc.
        city_normalized = None
        if city:
            city_stripped = city.strip()
            if city_stripped and city_stripped.lower() != 'all':
                city_normalized = city_stripped
        
        if city_normalized and not vendor_id:
            # Filter products by store city - only show products from stores in the selected city
            city_filter = city_normalized
            city_filter_applied = True
            print(f"DEBUG: Filtering products by store city: '{city_filter}'")
            
            try:
                # Get product IDs that belong to stores in the selected city
                # Note: or_ is already imported at the top of the file
                store_matching_products = db.query(Product.id).join(
                    Store, Product.store_id == Store.id
                ).filter(
                    Product.status == "active",
                    Store.is_active == True,
                    Store.city.isnot(None),
                    func.lower(Store.city).ilike(f"%{city_filter.lower()}%")
                ).distinct()
                
                matching_product_ids = [str(p.id) for p in store_matching_products.all()]
                print(f"DEBUG: Found {len(matching_product_ids)} products with stores in city '{city_filter}'")
                
                if matching_product_ids:
                    # Filter the main query to only include:
                    # 1. Products with matching store cities
                    # 2. Products with store_id = NULL (available at all stores)
                    matching_uuids = [UUID(pid) for pid in matching_product_ids]
                    query = query.filter(
                        or_(
                            Product.id.in_(matching_uuids),
                            Product.store_id.is_(None)  # Include products available at all stores
                        )
                    )
                else:
                    # No products with stores in this city, but still show products with store_id = NULL
                    query = query.filter(Product.store_id.is_(None))
                    print(f"DEBUG: No products found for city '{city_filter}', showing only products available at all stores")
            except Exception as e:
                print(f"DEBUG: Error in city filtering: {e}")
                import traceback
                traceback.print_exc()
                # On error, don't filter (show all products) rather than showing nothing
                city_filter_applied = False
        
        if not city_filter_applied:
            # City is "All" or not provided - show ALL products from ALL stores
            # No filtering by city - include products with any store_id (including NULL)
            print(f"DEBUG: City filter is 'All' or not provided - showing ALL products from ALL stores (no city filtering)")
        
        if category_id:
            try:
                query = query.filter(Product.category_id == UUID(category_id))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid category ID")
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term)
                )
            )
        
        if min_price is not None:
            query = query.filter(Product.price >= min_price)
        
        if max_price is not None:
            query = query.filter(Product.price <= max_price)
        
        if vendor_id:
            try:
                query = query.filter(Product.vendor_id == UUID(vendor_id))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid vendor ID")
        
        if featured:
            query = query.filter(Product.is_featured == True)
        
        if new_arrivals:
            # Products created in the last 7 days only (newly stocked items are only "new" for 1 week)
            from datetime import datetime, timedelta
            week_ago = datetime.utcnow() - timedelta(days=7)
            query = query.filter(Product.created_at >= week_ago)
        
        if discounted:
            # Products with compare_at_price > price OR products with active promotions
            from app.models.promotion import Promotion
            from datetime import datetime
            from sqlalchemy import and_
            now = datetime.utcnow()
            
            # Get active promotions for all vendors
            active_promotions = db.query(Promotion).filter(
                Promotion.is_active == True,
                Promotion.start_date <= now,
                Promotion.end_date >= now
            ).all()
            
            # Get product IDs from active promotions
            promoted_product_ids = set()
            for promo in active_promotions:
                if promo.applies_to_all_products:
                    # Get all products for this vendor
                    vendor_products = db.query(Product.id).filter(
                        Product.vendor_id == promo.vendor_id,
                        Product.status == "active"
                    ).all()
                    promoted_product_ids.update([str(p.id) for p in vendor_products])
                elif promo.product_ids:
                    promoted_product_ids.update([str(pid) for pid in promo.product_ids])
            
            # Filter: products with compare_at_price > price OR products in active promotions
            from uuid import UUID
            if promoted_product_ids:
                promoted_uuids = [UUID(pid) for pid in promoted_product_ids]
                query = query.filter(
                    or_(
                        and_(
                            Product.compare_at_price.isnot(None),
                            Product.compare_at_price > Product.price
                        ),
                        Product.id.in_(promoted_uuids)
                    )
                )
            else:
                query = query.filter(
                    Product.compare_at_price.isnot(None),
                    Product.compare_at_price > Product.price
                )
        
        if low_stock:
            # Products with stock_quantity <= 10
            query = query.filter(Product.stock_quantity <= 10, Product.stock_quantity > 0)
        
        # Debug: Log query details BEFORE counting
        print(f"DEBUG: City parameter received: '{city}' (type: {type(city)})")
        print(f"DEBUG: Vendor ID parameter: '{vendor_id}'")
        print(f"DEBUG: City filter applied: {city_filter_applied}")
        
        # Count total before pagination
        total = query.count()
        print(f"DEBUG: Total products after all filters (before pagination): {total}")
        
        # Debug: Check product distribution by store
        if total > 0:
            try:
                product_sample = query.limit(100).all()
                store_ids = {}
                null_store_count = 0
                for p in product_sample:
                    if p.store_id:
                        store_id_str = str(p.store_id)
                        store_ids[store_id_str] = store_ids.get(store_id_str, 0) + 1
                    else:
                        null_store_count += 1
                print(f"DEBUG: Product distribution - NULL store_id: {null_store_count}, Store IDs: {store_ids}")
            except Exception as e:
                print(f"DEBUG: Error checking product distribution: {e}")
        
        if total == 0 and city and city.lower() != 'all':
            print(f"DEBUG: No products found for city '{city}'. Checking available cities...")
            # Debug: Check what cities exist
            try:
                all_store_cities = db.query(func.distinct(Store.city)).filter(Store.city.isnot(None), Store.is_active == True).all()
                all_vendor_cities = db.query(func.distinct(Vendor.city)).filter(Vendor.city.isnot(None), Vendor.status == "active").all()
                print(f"DEBUG: Available store cities: {[c[0] for c in all_store_cities if c[0]]}")
                print(f"DEBUG: Available vendor cities: {[c[0] for c in all_vendor_cities if c[0]]}")
            except Exception as e:
                print(f"DEBUG: Error checking cities: {e}")
        
        # Order by created_at descending to show newest first
        products = query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()
        
        # Debug: Log what products are being returned
        if products:
            vendor_ids_in_results = list(set([str(p.vendor_id) for p in products]))
            store_ids_in_results = list(set([str(p.store_id) for p in products if p.store_id]))
            print(f"DEBUG: Returning {len(products)} products from {len(vendor_ids_in_results)} vendors, {len(store_ids_in_results)} stores")
        
        # Get vendor info for all products
        vendor_ids = [p.vendor_id for p in products]
        vendors = {str(v.id): v for v in db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()}
        
        # Get product ratings
        from app.models.review import Review
        from sqlalchemy import func
        product_ids = [p.id for p in products]
        product_ratings = {}
        if product_ids:
            try:
                rating_data = db.query(
                    Review.product_id,
                    func.avg(Review.rating).label('average_rating'),
                    func.count(Review.id).label('total_reviews')
                ).filter(
                    Review.product_id.in_(product_ids),
                    Review.is_public == True
                ).group_by(Review.product_id).all()
                
                for rating in rating_data:
                    # Round average rating to 1 decimal place (e.g., 3.5, 4.2)
                    avg_rating = float(rating.average_rating) if rating.average_rating else None
                    if avg_rating is not None:
                        avg_rating = round(avg_rating, 1)
                    product_ratings[str(rating.product_id)] = {
                        'average_rating': avg_rating,
                        'total_reviews': rating.total_reviews or 0
                    }
            except Exception as e:
                print(f"Error getting product ratings: {e}")
        
        # Get active promotions to mark products
        from app.models.promotion import Promotion
        from datetime import datetime
        now = datetime.utcnow()
        
        # Get vendor IDs from the products we're returning
        vendor_ids_in_results = list(set([p.vendor_id for p in products]))
        
        product_promotions = {}
        try:
            active_promotions = db.query(Promotion).filter(
                Promotion.is_active == True,
                Promotion.start_date <= now,
                Promotion.end_date >= now,
                Promotion.vendor_id.in_(vendor_ids_in_results)
            ).all()
            
            # Create map of product IDs to promotions
            for promo in active_promotions:
                if promo.applies_to_all_products:
                    vendor_products = db.query(Product.id).filter(
                        Product.vendor_id == promo.vendor_id,
                        Product.status == "active"
                    ).all()
                    for prod in vendor_products:
                        pid_str = str(prod.id)
                        if pid_str not in product_promotions:
                            product_promotions[pid_str] = []
                        product_promotions[pid_str].append({
                            "id": str(promo.id),
                            "name": str(promo.name).strip() if promo.name and str(promo.name).strip() else "Special Offer",
                            "discount_type": promo.discount_type,
                            "discount_value": float(promo.discount_value) if promo.discount_value else None
                        })
                elif promo.product_ids:
                    for pid in promo.product_ids:
                        pid_str = str(pid)
                        if pid_str not in product_promotions:
                            product_promotions[pid_str] = []
                        product_promotions[pid_str].append({
                            "id": str(promo.id),
                            "name": str(promo.name).strip() if promo.name and str(promo.name).strip() else "Special Offer",
                            "discount_type": promo.discount_type,
                            "discount_value": float(promo.discount_value) if promo.discount_value else None
                        })
        except Exception as e:
            print(f"Error getting promotions: {e}")
        
        return {
        "products": [
            {
                "id": str(p.id),
                "name": p.name,
                "description": p.description,
                "price": float(p.price),
                "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
                "image_url": resolve_upload_url(p.image_url),
                "images": resolve_upload_urls(p.images) or [],
                "category_id": str(p.category_id) if p.category_id else None,
                "vendor_id": str(p.vendor_id),
                "store_id": str(p.store_id) if p.store_id else None,
                "stock_quantity": p.stock_quantity,
                "is_featured": p.is_featured,
                "slug": p.slug,
                "unit": p.unit,
                "weight_kg": float(p.weight_kg) if p.weight_kg else None,
                "is_newly_stocked": p.is_newly_stocked,
                "promotions": product_promotions.get(str(p.id), []),  # Add active promotions
                "average_rating": product_ratings.get(str(p.id), {}).get('average_rating'),
                "total_reviews": product_ratings.get(str(p.id), {}).get('total_reviews', 0),
                "vendor": {
                    "id": str(v.id),
                    "business_name": v.business_name
                } if (v := vendors.get(str(p.vendor_id))) else None
            }
            for p in products
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }
    except Exception as e:
        import traceback
        error_msg = f"Error in get_products: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.get("/products/{product_id}", response_model=dict)
async def get_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """Get a single product with vendor info"""
    from uuid import UUID
    
    # Don't match "categories" as a product_id
    if product_id == "categories":
        raise HTTPException(status_code=404, detail="Not found")
    
    # Safely convert product_id to UUID
    try:
        product_uuid = UUID(product_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid product ID format")
    
    product = db.query(Product).join(
        Vendor, Product.vendor_id == Vendor.id
    ).filter(
        Product.id == product_uuid,
        Product.status == "active",
        Vendor.status == "active"
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    vendor = db.query(Vendor).filter(Vendor.id == product.vendor_id).first()
    
    # Get product ratings
    from app.models.review import Review
    from sqlalchemy import func
    rating_data = db.query(
        func.avg(Review.rating).label('average_rating'),
        func.count(Review.id).label('total_reviews')
    ).filter(
        Review.product_id == product.id,
        Review.is_public == True
    ).first()
    
    # Round average rating to 1 decimal place (e.g., 3.5, 4.2)
    average_rating = None
    if rating_data and rating_data.average_rating:
        average_rating = round(float(rating_data.average_rating), 1)
    total_reviews = rating_data.total_reviews if rating_data else 0
    
    # Get active promotions for this product
    from app.models.promotion import Promotion
    from datetime import datetime
    now = datetime.utcnow()
    active_promotions = db.query(Promotion).filter(
        Promotion.is_active == True,
        Promotion.start_date <= now,
        Promotion.end_date >= now,
        Promotion.vendor_id == product.vendor_id
    ).all()
    
    product_promotions = []
    for promo in active_promotions:
        applies = False
        if promo.applies_to_all_products:
            applies = True
        elif promo.product_ids and product.id in promo.product_ids:
            applies = True
        
        if applies:
            product_promotions.append({
                "name": str(promo.name).strip() if promo.name and str(promo.name).strip() else "Special Offer",
                "discount_type": promo.discount_type,
                "discount_value": float(promo.discount_value) if promo.discount_value else None
            })
    
    return {
        "id": str(product.id),
        "name": product.name,
        "description": product.description,
        "price": float(product.price),
        "compare_at_price": float(product.compare_at_price) if product.compare_at_price else None,
        "promotions": product_promotions,
        "image_url": resolve_upload_url(product.image_url),
        "images": resolve_upload_urls(product.images) or [],
        "category_id": str(product.category_id) if product.category_id else None,
        "vendor_id": str(product.vendor_id),
        "store_id": str(product.store_id) if product.store_id else None,
        "vendor": {
            "id": str(vendor.id),
            "business_name": vendor.business_name,
            "average_rating": float(vendor.average_rating) if vendor.average_rating else None,
            "total_reviews": vendor.total_reviews
        },
        "stock_quantity": product.stock_quantity,
        "is_featured": product.is_featured,
        "is_newly_stocked": product.is_newly_stocked,
        "slug": product.slug,
        "unit": product.unit,
        "weight_kg": float(product.weight_kg) if product.weight_kg else None,
        "sku": product.sku,
        "barcode": product.barcode,
        "average_rating": average_rating,
        "total_reviews": total_reviews
    }


@router.get("/vendors", response_model=List[dict])
async def get_vendors(
    db: Session = Depends(get_db)
):
    """Get all active vendors"""
    vendors = db.query(Vendor).filter(Vendor.status == "active").all()
    return [
        {
            "id": str(v.id),
            "business_name": v.business_name,
            "description": v.description,
            "store_profile_image_url": v.store_profile_image_url,
            "average_rating": float(v.average_rating) if v.average_rating else None,
            "total_reviews": v.total_reviews,
            "city": v.city,
            "state": v.state
        }
        for v in vendors
    ]

