"""
Barcode management endpoints for admin and vendor
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from app.core.database import get_db
from app.models.product import Product
from app.api.v1.dependencies import get_current_admin, get_current_vendor
import uuid

router = APIRouter()


@router.get("/lookup")
async def lookup_product_by_barcode(
    barcode: str = Query(..., description="Barcode to search for"),
    current_admin: Optional[dict] = Depends(get_current_admin),
    current_vendor: Optional[dict] = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """
    Lookup product by barcode
    Admin can see all products, vendors can only see their own
    """
    product = db.query(Product).filter(Product.barcode == barcode).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found with this barcode"
        )
    
    # If vendor, check ownership
    if current_vendor and not current_admin:
        vendor_id = UUID(current_vendor.get("vendor_id"))
        if product.vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this product"
            )
    
    return {
        "id": str(product.id),
        "vendor_id": str(product.vendor_id),
        "name": product.name,
        "description": product.description,
        "price": float(product.price) if product.price else None,
        "sale_price": float(product.sale_price) if product.sale_price else None,
        "sku": product.sku,
        "barcode": product.barcode,
        "stock_quantity": product.stock_quantity,
        "low_stock_threshold": product.low_stock_threshold,
        "status": product.status,
        "is_active": product.status == "active",
        "image_url": product.image_url,
        "category_id": str(product.category_id) if product.category_id else None
    }


@router.post("/generate")
async def generate_barcode(
    product_id: Optional[str] = Query(None, description="Product ID to generate barcode for"),
    sku: Optional[str] = Query(None, description="Use SKU as barcode if product_id not provided"),
    current_admin: Optional[dict] = Depends(get_current_admin),
    current_vendor: Optional[dict] = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """
    Generate a barcode for a product
    If product_id is provided, generates and saves barcode for that product
    If sku is provided, generates barcode based on SKU
    Returns the generated barcode
    """
    if not product_id and not sku:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either product_id or sku must be provided"
        )
    
    product = None
    if product_id:
        try:
            product = db.query(Product).filter(Product.id == UUID(product_id)).first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found"
                )
            
            # If vendor, check ownership
            if current_vendor and not current_admin:
                vendor_id = UUID(current_vendor.get("vendor_id"))
                if product.vendor_id != vendor_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You don't have access to this product"
                    )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid product ID format"
            )
    
    # Generate barcode
    if product and product.barcode:
        # Product already has a barcode
        return {
            "barcode": product.barcode,
            "product_id": str(product.id),
            "product_name": product.name,
            "message": "Product already has a barcode"
        }
    
    # Generate new barcode
    # Use UUID-based barcode or SKU-based
    if product and product.sku:
        generated_barcode = product.sku
    elif sku:
        generated_barcode = sku
    else:
        # Generate a unique barcode using UUID
        generated_barcode = f"EAZY{str(uuid.uuid4()).replace('-', '').upper()[:12]}"
    
    # Check if barcode already exists
    existing = db.query(Product).filter(Product.barcode == generated_barcode).first()
    if existing:
        # If it exists and it's not the same product, generate a new one
        if not product or existing.id != product.id:
            generated_barcode = f"EAZY{str(uuid.uuid4()).replace('-', '').upper()[:12]}"
    
    # Save barcode to product if product_id was provided
    if product:
        product.barcode = generated_barcode
        db.commit()
        db.refresh(product)
    
    return {
        "barcode": generated_barcode,
        "product_id": str(product.id) if product else None,
        "product_name": product.name if product else None,
        "message": "Barcode generated successfully"
    }


@router.get("/search")
async def search_by_barcode(
    barcode: str = Query(..., description="Barcode to search for (partial match)"),
    current_admin: Optional[dict] = Depends(get_current_admin),
    current_vendor: Optional[dict] = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """
    Search products by barcode (partial match)
    Admin can see all products, vendors can only see their own
    """
    query = db.query(Product).filter(Product.barcode.ilike(f"%{barcode}%"))
    
    # If vendor, filter by vendor_id
    if current_vendor and not current_admin:
        vendor_id = UUID(current_vendor.get("vendor_id"))
        query = query.filter(Product.vendor_id == vendor_id)
    
    products = query.limit(50).all()
    
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "barcode": p.barcode,
            "sku": p.sku,
            "stock_quantity": p.stock_quantity,
            "price": float(p.price) if p.price else None,
            "status": p.status,
            "image_url": p.image_url
        }
        for p in products
    ]

