"""
Admin barcode management and control endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from app.core.database import get_db
from app.models.product import Product
from app.models.vendor import Vendor
from app.api.v1.dependencies import get_current_admin
from pydantic import BaseModel

router = APIRouter()


class BarcodeSettingsUpdate(BaseModel):
    auto_generate_on_product_create: bool = True
    barcode_format: str = "CODE128"  # CODE128, EAN13, UPC, etc.
    barcode_prefix: Optional[str] = None  # Prefix for generated barcodes
    require_barcode_for_products: bool = False
    allow_vendor_barcode_generation: bool = True
    allow_vendor_barcode_editing: bool = True
    barcode_validation_enabled: bool = True
    duplicate_barcode_allowed: bool = False


@router.get("/settings", response_model=dict)
async def get_barcode_settings(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get barcode system settings"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get settings from platform_settings table if exists, otherwise return defaults
    from app.models.platform_settings import PlatformSettings
    settings = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == "barcode"
    ).first()
    
    if settings:
        return settings.settings_data
    else:
        # Return default settings
        return {
            "auto_generate_on_product_create": True,
            "barcode_format": "CODE128",
            "barcode_prefix": None,
            "require_barcode_for_products": False,
            "allow_vendor_barcode_generation": True,
            "allow_vendor_barcode_editing": True,
            "barcode_validation_enabled": True,
            "duplicate_barcode_allowed": False
        }


@router.put("/settings", response_model=dict)
async def update_barcode_settings(
    settings_data: BarcodeSettingsUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update barcode system settings"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    from app.models.platform_settings import PlatformSettings
    
    settings = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == "barcode"
    ).first()
    
    if settings:
        settings.settings_data = settings_data.dict()
        settings.updated_at = datetime.utcnow()
    else:
        settings = PlatformSettings(
            setting_type="barcode",
            settings_data=settings_data.dict()
        )
        db.add(settings)
    
    db.commit()
    
    return {"message": "Barcode settings updated successfully"}


@router.get("/products", response_model=dict)
async def get_all_products_with_barcodes(
    skip: int = 0,
    limit: int = 100,
    vendor_id: Optional[str] = None,
    has_barcode: Optional[bool] = None,
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all products with barcode information"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(Product)
    
    if vendor_id:
        query = query.filter(Product.vendor_id == UUID(vendor_id))
    
    if has_barcode is not None:
        if has_barcode:
            query = query.filter(Product.barcode.isnot(None), Product.barcode != '')
        else:
            query = query.filter(or_(Product.barcode.is_(None), Product.barcode == ''))
    
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.barcode.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%")
            )
        )
    
    total = query.count()
    products = query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "products": [
            {
                "id": str(p.id),
                "name": p.name,
                "vendor_id": str(p.vendor_id),
                "vendor_name": p.vendor.business_name if p.vendor else None,
                "sku": p.sku,
                "barcode": p.barcode,
                "has_barcode": bool(p.barcode),
                "stock_quantity": p.stock_quantity,
                "status": p.status,
                "created_at": p.created_at.isoformat()
            }
            for p in products
        ],
        "total": total,
        "statistics": {
            "total_products": db.query(func.count(Product.id)).scalar(),
            "products_with_barcode": db.query(func.count(Product.id)).filter(
                Product.barcode.isnot(None),
                Product.barcode != ''
            ).scalar(),
            "products_without_barcode": db.query(func.count(Product.id)).filter(
                or_(Product.barcode.is_(None), Product.barcode == '')
            ).scalar()
        }
    }


@router.post("/products/bulk-generate", response_model=dict)
async def bulk_generate_barcodes(
    product_ids: List[str] = None,
    vendor_id: Optional[str] = None,
    generate_for_all: bool = False,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Bulk generate barcodes for products"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    import uuid
    
    # Get settings
    from app.models.platform_settings import PlatformSettings
    settings_obj = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == "barcode"
    ).first()
    
    settings = settings_obj.settings_data if settings_obj else {}
    prefix = settings.get("barcode_prefix", "")
    format_type = settings.get("barcode_format", "CODE128")
    
    query = db.query(Product)
    
    if generate_for_all:
        # Generate for all products without barcodes
        query = query.filter(or_(Product.barcode.is_(None), Product.barcode == ''))
    elif product_ids:
        query = query.filter(Product.id.in_([UUID(pid) for pid in product_ids]))
    elif vendor_id:
        query = query.filter(
            Product.vendor_id == UUID(vendor_id),
            or_(Product.barcode.is_(None), Product.barcode == '')
        )
    else:
        raise HTTPException(status_code=400, detail="Must provide product_ids, vendor_id, or set generate_for_all=true")
    
    products = query.all()
    generated_count = 0
    errors = []
    
    for product in products:
        try:
            # Generate barcode
            if product.sku:
                generated_barcode = f"{prefix}{product.sku}" if prefix else product.sku
            else:
                generated_barcode = f"{prefix}EAZY{str(uuid.uuid4()).replace('-', '').upper()[:12]}" if prefix else f"EAZY{str(uuid.uuid4()).replace('-', '').upper()[:12]}"
            
            # Check for duplicates if not allowed
            if not settings.get("duplicate_barcode_allowed", False):
                existing = db.query(Product).filter(
                    Product.barcode == generated_barcode,
                    Product.id != product.id
                ).first()
                if existing:
                    # Generate unique one
                    generated_barcode = f"{prefix}EAZY{str(uuid.uuid4()).replace('-', '').upper()[:12]}" if prefix else f"EAZY{str(uuid.uuid4()).replace('-', '').upper()[:12]}"
            
            product.barcode = generated_barcode
            generated_count += 1
        except Exception as e:
            errors.append(f"Product {product.name}: {str(e)}")
    
    db.commit()
    
    return {
        "message": f"Generated {generated_count} barcodes",
        "generated_count": generated_count,
        "errors": errors
    }


@router.get("/statistics", response_model=dict)
async def get_barcode_statistics(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get barcode usage statistics"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    total_products = db.query(func.count(Product.id)).scalar()
    products_with_barcode = db.query(func.count(Product.id)).filter(
        Product.barcode.isnot(None),
        Product.barcode != ''
    ).scalar()
    products_without_barcode = total_products - products_with_barcode
    
    # Barcode usage by vendor
    vendor_stats = db.query(
        Vendor.id,
        Vendor.business_name,
        func.count(Product.id).label("total_products"),
        func.count(Product.barcode).filter(Product.barcode.isnot(None), Product.barcode != '').label("with_barcode")
    ).join(Product, Vendor.id == Product.vendor_id).group_by(Vendor.id, Vendor.business_name).all()
    
    return {
        "overview": {
            "total_products": total_products,
            "products_with_barcode": products_with_barcode,
            "products_without_barcode": products_without_barcode,
            "barcode_coverage_percentage": round((products_with_barcode / total_products * 100) if total_products > 0 else 0, 2)
        },
        "by_vendor": [
            {
                "vendor_id": str(v.id),
                "vendor_name": v.business_name,
                "total_products": v.total_products,
                "with_barcode": v.with_barcode,
                "without_barcode": v.total_products - v.with_barcode,
                "coverage_percentage": round((v.with_barcode / v.total_products * 100) if v.total_products > 0 else 0, 2)
            }
            for v in vendor_stats
        ]
    }


@router.put("/products/{product_id}/barcode", response_model=dict)
async def update_product_barcode(
    product_id: str,
    barcode: str = Query(..., description="New barcode value"),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Update product barcode"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    product = db.query(Product).filter(Product.id == UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check for duplicates if validation enabled
    from app.models.platform_settings import PlatformSettings
    settings_obj = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == "barcode"
    ).first()
    
    settings = settings_obj.settings_data if settings_obj else {}
    if settings.get("barcode_validation_enabled", True) and not settings.get("duplicate_barcode_allowed", False):
        existing = db.query(Product).filter(
            Product.barcode == barcode.upper().strip(),
            Product.id != product.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Barcode already exists for another product")
    
    product.barcode = barcode.upper().strip()
    db.commit()
    
    return {"message": "Barcode updated successfully", "barcode": product.barcode}


@router.delete("/products/{product_id}/barcode", response_model=dict)
async def remove_product_barcode(
    product_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Remove product barcode"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    product = db.query(Product).filter(Product.id == UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.barcode = None
    db.commit()
    
    return {"message": "Barcode removed successfully"}

