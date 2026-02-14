"""
Product management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from app.core.database import get_db
from app.core.config import resolve_upload_url, resolve_upload_urls
from app.models.product import Product, Category
from app.schemas.product import ProductResponse, ProductCreate, ProductUpdate
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.get("/", response_model=List[ProductResponse])
async def get_products(
    skip: int = 0,
    limit: int = 100,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get all products for current vendor"""
    from uuid import UUID
    try:
        # Show all products regardless of status (vendor can see inactive products too)
        products = db.query(Product).filter(
            Product.vendor_id == UUID(current_vendor["vendor_id"])
        ).order_by(Product.created_at.desc()).offset(skip).limit(limit).all()
        
        # Convert UUIDs to strings for response
        result = []
        for p in products:
            try:
                result.append({
                    "id": str(p.id),
                    "vendor_id": str(p.vendor_id),
                    "store_id": str(p.store_id) if p.store_id else None,
                    "name": p.name,
                    "description": p.description,
                    "price": float(p.price) if p.price else 0,
                    "sale_price": float(p.sale_price) if p.sale_price else None,
                    "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
                    "category_id": str(p.category_id) if p.category_id else None,
                    "sku": p.sku,
                    "barcode": p.barcode,
                    "image_url": resolve_upload_url(p.image_url),
                    "images": resolve_upload_urls(p.images) or [],
                    "unit": p.unit,
                    "stock_quantity": p.stock_quantity or 0,
                    "low_stock_threshold": p.low_stock_threshold or 10,
                    "expiry_date": p.expiry_date.isoformat() if p.expiry_date else None,
                    "track_expiry": p.track_expiry or False,
                    "status": p.status,
                    "is_featured": p.is_featured or False,
                    "is_newly_stocked": p.is_newly_stocked or False,
                    "slug": p.slug
                })
            except Exception as e:
                print(f"Error processing product {p.id}: {e}")
                continue
        
        return result
    except Exception as e:
        import traceback
        print(f"Error in get_products: {e}")
        traceback.print_exc()
        return []


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Create a new product"""
    from uuid import UUID
    
    # Generate slug if not provided
    import re
    if not product_data.slug or product_data.slug.strip() == '':
        slug = re.sub(r'[^a-z0-9]+', '-', product_data.name.lower()).strip('-')
    else:
        slug = product_data.slug
    
    # Ensure slug is unique
    existing = db.query(Product).filter(Product.slug == slug).first()
    if existing:
        import time
        slug = f"{slug}-{int(time.time())}"
    
    # Prepare product data, handling store_id separately
    product_dict = product_data.dict(exclude={'slug', 'store_id'})
    product_dict['slug'] = slug
    product_dict['vendor_id'] = UUID(current_vendor["vendor_id"])
    
    # Handle store_id if provided
    if product_data.store_id:
        try:
            product_dict['store_id'] = UUID(product_data.store_id)
        except (ValueError, TypeError) as e:
            print(f"Error converting store_id for create: {e}")
            # Invalid store_id, set to None
            product_dict['store_id'] = None
    else:
        product_dict['store_id'] = None
    
    try:
        product = Product(**product_dict)
        db.add(product)
        db.commit()
        db.refresh(product)
    except Exception as e:
        print(f"Error creating product: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating product: {str(e)}"
        )
    
    # Convert UUIDs to strings for response
    return {
        "id": str(product.id),
        "vendor_id": str(product.vendor_id),
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "sale_price": product.sale_price,
        "compare_at_price": product.compare_at_price,
        "category_id": str(product.category_id) if product.category_id else None,
        "sku": product.sku,
        "barcode": product.barcode,
        "image_url": resolve_upload_url(product.image_url),
        "images": resolve_upload_urls(product.images) or [],
        "unit": product.unit,
        "stock_quantity": product.stock_quantity,
        "low_stock_threshold": product.low_stock_threshold,
        "expiry_date": product.expiry_date.isoformat() if product.expiry_date else None,
        "track_expiry": product.track_expiry or False,
        "status": product.status,
        "is_featured": product.is_featured,
        "is_newly_stocked": product.is_newly_stocked,
        "slug": product.slug
    }


@router.get("/categories/list")
async def get_categories(
    db: Session = Depends(get_db)
):
    """Get all categories for vendor product form (no auth required)."""
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
                    "name": row[1] if row[1] else "",
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


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get a specific product"""
    from uuid import UUID
    product = db.query(Product).filter(
        Product.id == UUID(product_id),
        Product.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return {
        "id": str(product.id),
        "vendor_id": str(product.vendor_id),
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "sale_price": product.sale_price,
        "compare_at_price": product.compare_at_price,
        "category_id": str(product.category_id) if product.category_id else None,
        "sku": product.sku,
        "barcode": product.barcode,
        "image_url": resolve_upload_url(product.image_url),
        "images": resolve_upload_urls(product.images) or [],
        "unit": product.unit,
        "stock_quantity": product.stock_quantity,
        "low_stock_threshold": product.low_stock_threshold,
        "expiry_date": product.expiry_date.isoformat() if product.expiry_date else None,
        "track_expiry": product.track_expiry or False,
        "status": product.status,
        "is_featured": product.is_featured,
        "is_newly_stocked": product.is_newly_stocked,
        "slug": product.slug,
        "store_id": str(product.store_id) if product.store_id else None
    }


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Update a product"""
    from uuid import UUID
    product = db.query(Product).filter(
        Product.id == UUID(product_id),
        Product.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    update_data = product_update.dict(exclude_unset=True)
    
    # Required fields that cannot be None - exclude them from update if they're None
    required_fields = ['price', 'name']
    for field in required_fields:
        if field in update_data and (update_data[field] is None or update_data[field] == ''):
            # Don't update required fields if they're None/empty - keep existing value
            update_data.pop(field, None)
    
    # Handle store_id separately - convert string UUID to UUID object
    if 'store_id' in update_data:
        store_id_value = update_data.pop('store_id')
        if store_id_value:
            try:
                # Handle both string and UUID types
                if isinstance(store_id_value, str):
                    product.store_id = UUID(store_id_value)
                else:
                    product.store_id = store_id_value
            except (ValueError, TypeError) as e:
                print(f"Error converting store_id: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid store_id format: {str(e)}"
                )
        else:
            product.store_id = None
    
    # Handle category_id conversion if present
    if 'category_id' in update_data:
        category_id_value = update_data.pop('category_id')
        if category_id_value:
            try:
                product.category_id = UUID(category_id_value) if isinstance(category_id_value, str) else category_id_value
            except (ValueError, TypeError) as e:
                print(f"Error converting category_id: {e}")
                # Don't update category_id if invalid
                pass
        else:
            product.category_id = None
    
    # Handle other fields - skip None values for non-nullable fields
    for field, value in update_data.items():
        # Skip None values for fields that shouldn't be None
        if value is None and field in ['price', 'name']:
            continue
            
        try:
            setattr(product, field, value)
        except Exception as e:
            print(f"Error setting field {field}: {e}")
            import traceback
            traceback.print_exc()
            # Skip problematic fields rather than failing
            continue
    
    try:
        db.commit()
        db.refresh(product)
    except Exception as e:
        print(f"Error committing product update: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating product: {str(e)}"
        )
    
    # Convert UUIDs to strings for response
    return {
        "id": str(product.id),
        "vendor_id": str(product.vendor_id),
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "sale_price": product.sale_price,
        "compare_at_price": product.compare_at_price,
        "category_id": str(product.category_id) if product.category_id else None,
        "sku": product.sku,
        "barcode": product.barcode,
        "image_url": resolve_upload_url(product.image_url),
        "images": resolve_upload_urls(product.images) or [],
        "unit": product.unit,
        "stock_quantity": product.stock_quantity,
        "low_stock_threshold": product.low_stock_threshold,
        "expiry_date": product.expiry_date.isoformat() if product.expiry_date else None,
        "track_expiry": product.track_expiry or False,
        "status": product.status,
        "is_featured": product.is_featured,
        "is_newly_stocked": product.is_newly_stocked,
        "slug": product.slug,
        "store_id": str(product.store_id) if product.store_id else None
    }


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Delete a product"""
    from uuid import UUID
    product = db.query(Product).filter(
        Product.id == UUID(product_id),
        Product.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db.delete(product)
    db.commit()


@router.get("/expiring-soon/list", response_model=List[ProductResponse])
async def get_expiring_products(
    skip: int = 0,
    limit: int = 100,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get products expiring within 1 month"""
    from uuid import UUID
    vendor_id = UUID(current_vendor["vendor_id"])
    today = date.today()
    one_month_from_now = today + timedelta(days=30)
    
    products = db.query(Product).filter(
        Product.vendor_id == vendor_id,
        Product.track_expiry == True,
        Product.expiry_date.isnot(None),
        Product.expiry_date >= today,
        Product.expiry_date <= one_month_from_now
    ).order_by(Product.expiry_date.asc()).offset(skip).limit(limit).all()
    
    result = []
    for p in products:
        try:
            result.append({
                "id": str(p.id),
                "vendor_id": str(p.vendor_id),
                "store_id": str(p.store_id) if p.store_id else None,
                "name": p.name,
                "description": p.description,
                "price": float(p.price) if p.price else 0,
                "sale_price": float(p.sale_price) if p.sale_price else None,
                "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
                "category_id": str(p.category_id) if p.category_id else None,
                "sku": p.sku,
                "barcode": p.barcode,
                "image_url": resolve_upload_url(p.image_url),
                "images": resolve_upload_urls(p.images) or [],
                "unit": p.unit,
                "stock_quantity": p.stock_quantity or 0,
                "low_stock_threshold": p.low_stock_threshold or 10,
                "expiry_date": p.expiry_date.isoformat() if p.expiry_date else None,
                "track_expiry": p.track_expiry or False,
                "status": p.status,
                "is_featured": p.is_featured or False,
                "is_newly_stocked": p.is_newly_stocked or False,
                "slug": p.slug
            })
        except Exception as e:
            print(f"Error processing product {p.id}: {e}")
            continue
    
    return result
