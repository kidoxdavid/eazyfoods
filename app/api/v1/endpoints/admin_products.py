"""
Admin product management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
# Import Vendor first to ensure relationship resolution
from app.models.vendor import Vendor
from app.models.product import Product, Category
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_products(
    skip: int = 0,
    limit: int = 50,
    vendor_id: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all products across all vendors"""
    query = db.query(Product)
    
    if vendor_id:
        query = query.filter(Product.vendor_id == UUID(vendor_id))
    
    if category_id:
        query = query.filter(Product.category_id == UUID(category_id))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.sku.ilike(search_term)
            )
        )
    
    try:
        products = query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()
        
        result = []
        for product in products:
            try:
                vendor = db.query(Vendor).filter(Vendor.id == product.vendor_id).first()
                category = db.query(Category).filter(Category.id == product.category_id).first() if product.category_id else None
                
                result.append({
                    "id": str(product.id),
                    "name": product.name,
                    "sku": product.sku,
                    "barcode": product.barcode,
                    "price": float(product.price),
                    "stock_quantity": product.stock_quantity,
                    "vendor_id": str(product.vendor_id),
                    "vendor_name": vendor.business_name if vendor else None,
                    "category_id": str(product.category_id) if product.category_id else None,
                    "category_name": category.name if category else None,
                    "is_active": product.status == "active",  # Convert status to is_active boolean
                    "status": product.status,
                    "created_at": product.created_at
                })
            except Exception as e:
                import traceback
                print(f"Error processing product {product.id}: {e}")
                traceback.print_exc()
                continue
        
        return result
    except Exception as e:
        import traceback
        error_msg = f"Error in get_all_products: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.get("/{product_id}", response_model=dict)
async def get_product_detail(
    product_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed product information"""
    # Validate UUID format
    try:
        product_uuid = UUID(product_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid product ID format: {str(e)}"
        )
    
    product = db.query(Product).filter(Product.id == product_uuid).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    vendor = db.query(Vendor).filter(Vendor.id == product.vendor_id).first()
    category = db.query(Category).filter(Category.id == product.category_id).first()
    
    return {
        "id": str(product.id),
        "name": product.name,
        "description": product.description,
        "sku": product.sku,
        "price": float(product.price),
        "compare_at_price": float(product.compare_at_price) if product.compare_at_price else None,
        "stock_quantity": product.stock_quantity,
        "vendor_id": str(product.vendor_id),
        "vendor_name": vendor.business_name if vendor else None,
        "category_id": str(product.category_id) if product.category_id else None,
        "category_name": category.name if category else None,
        "is_active": product.status == "active",  # Convert status to is_active boolean
        "status": product.status,
        "is_newly_stocked": product.is_newly_stocked,
        "image_url": product.image_url,
        "created_at": product.created_at,
        "updated_at": product.updated_at
    }


@router.put("/{product_id}")
async def update_product(
    product_id: str,
    product_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update product information"""
    # Validate UUID format
    try:
        product_uuid = UUID(product_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid product ID format: {str(e)}"
        )
    
    product = db.query(Product).filter(Product.id == product_uuid).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update allowed fields
    allowed_fields = ["name", "description", "price", "compare_at_price", "stock_quantity", "is_newly_stocked"]
    for field, value in product_data.items():
        if field == "is_active":
            # Convert is_active boolean to status string
            product.status = "active" if value else "inactive"
        elif field in allowed_fields and hasattr(product, field):
            setattr(product, field, value)
    
    from datetime import datetime
    product.updated_at = datetime.utcnow()
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="product_updated",
        entity_type="product",
        entity_id=product.id,
        details={"changes": product_data, "product_name": product.name}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Product updated successfully"}


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a product"""
    # Validate UUID format
    try:
        product_uuid = UUID(product_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid product ID format: {str(e)}"
        )
    
    product = db.query(Product).filter(Product.id == product_uuid).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product_name = product.name
    db.delete(product)
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="product_deleted",
        entity_type="product",
        entity_id=UUID(product_id),
        details={"product_name": product_name}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Product deleted successfully"}

