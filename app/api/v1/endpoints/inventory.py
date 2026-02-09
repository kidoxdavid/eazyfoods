"""
Inventory management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.inventory import InventoryAdjustment, LowStockAlert, ExpiryAlert
from app.models.product import Product
from app.schemas.inventory import (
    InventoryAdjustmentCreate,
    InventoryAdjustmentResponse,
    LowStockAlertResponse,
    ExpiryAlertResponse
)
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.post("/adjustments", response_model=InventoryAdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_adjustment(
    adjustment_data: InventoryAdjustmentCreate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Create an inventory adjustment (stock in, stock out, etc.)
    Can also accept barcode instead of product_id for easier scanning
    """
    from uuid import UUID
    
    product = None
    
    # If barcode is provided, lookup product by barcode
    if hasattr(adjustment_data, 'barcode') and adjustment_data.barcode:
        product = db.query(Product).filter(
            Product.barcode == adjustment_data.barcode,
            Product.vendor_id == UUID(current_vendor["vendor_id"])
        ).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found with this barcode"
            )
    elif adjustment_data.product_id:
        # Verify product belongs to vendor
        product = db.query(Product).filter(
            Product.id == UUID(adjustment_data.product_id),
            Product.vendor_id == UUID(current_vendor["vendor_id"])
        ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get current quantity
    quantity_before = product.stock_quantity
    quantity_after = quantity_before + adjustment_data.quantity_change
    
    if quantity_after < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock. Cannot have negative quantity."
        )
    
    # Create adjustment record
    adjustment = InventoryAdjustment(
        vendor_id=UUID(current_vendor["vendor_id"]),
        product_id=product.id,  # Use product.id from the found product
        adjustment_type=adjustment_data.adjustment_type,
        quantity_change=adjustment_data.quantity_change,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason=adjustment_data.reason,
        reference_number=adjustment_data.reference_number,
        performed_by=UUID(current_vendor.get("user_id") or current_vendor["vendor_id"]),
        notes=adjustment_data.notes
    )
    
    # Update product stock
    product.stock_quantity = quantity_after
    
    db.add(adjustment)
    db.commit()
    db.refresh(adjustment)
    
    # Convert to response format
    return {
        "id": str(adjustment.id),
        "product_id": str(adjustment.product_id),
        "adjustment_type": adjustment.adjustment_type,
        "quantity_change": adjustment.quantity_change,
        "quantity_before": adjustment.quantity_before,
        "quantity_after": adjustment.quantity_after,
        "reason": adjustment.reason,
        "reference_number": adjustment.reference_number,
        "notes": adjustment.notes,
        "created_at": adjustment.created_at
    }


@router.get("/adjustments", response_model=List[InventoryAdjustmentResponse])
async def get_inventory_adjustments(
    skip: int = 0,
    limit: int = 100,
    product_id: str = None,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get inventory adjustment history"""
    from uuid import UUID
    
    query = db.query(InventoryAdjustment).filter(
        InventoryAdjustment.vendor_id == UUID(current_vendor["vendor_id"])
    )
    
    if product_id:
        query = query.filter(InventoryAdjustment.product_id == UUID(product_id))
    
    adjustments = query.order_by(InventoryAdjustment.created_at.desc()).offset(skip).limit(limit).all()
    
    # Convert to response format
    return [
        {
            "id": str(a.id),
            "product_id": str(a.product_id),
            "adjustment_type": a.adjustment_type,
            "quantity_change": a.quantity_change,
            "quantity_before": a.quantity_before,
            "quantity_after": a.quantity_after,
            "reason": a.reason,
            "reference_number": a.reference_number,
            "notes": a.notes,
            "created_at": a.created_at
        }
        for a in adjustments
    ]


@router.get("/low-stock-alerts")
async def get_low_stock_alerts(
    resolved: bool = False,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get low stock alerts"""
    from uuid import UUID
    from sqlalchemy.orm import joinedload
    
    query = db.query(LowStockAlert).options(
        joinedload(LowStockAlert.product)
    ).filter(
        LowStockAlert.vendor_id == UUID(current_vendor["vendor_id"]),
        LowStockAlert.is_resolved == resolved
    )
    
    alerts = query.order_by(LowStockAlert.created_at.desc()).all()
    
    # Convert to response format with UUIDs as strings
    result = []
    for a in alerts:
        alert_dict = {
            "id": str(a.id),
            "vendor_id": str(a.vendor_id),
            "product_id": str(a.product_id),
            "current_quantity": int(a.current_quantity) if a.current_quantity else 0,
            "threshold_quantity": int(a.threshold_quantity) if a.threshold_quantity else 0,
            "is_resolved": a.is_resolved,
            "resolved_at": str(a.resolved_at) if a.resolved_at else None,
            "created_at": str(a.created_at) if a.created_at else None
        }
        
        # Add product info if available
        if a.product:
            alert_dict["product_name"] = a.product.name
            alert_dict["product"] = {
                "id": str(a.product.id),
                "name": a.product.name,
                "image_url": a.product.image_url
            }
        else:
            alert_dict["product_name"] = "Unknown Product"
        
        result.append(alert_dict)
    
    return result


@router.put("/low-stock-alerts/{alert_id}/resolve", response_model=LowStockAlertResponse)
async def resolve_low_stock_alert(
    alert_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Mark a low stock alert as resolved"""
    from uuid import UUID
    
    alert = db.query(LowStockAlert).filter(
        LowStockAlert.id == UUID(alert_id),
        LowStockAlert.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(alert)
    
    # Convert to response format
    return {
        "id": str(alert.id),
        "vendor_id": str(alert.vendor_id),
        "product_id": str(alert.product_id),
        "current_quantity": int(alert.current_quantity) if alert.current_quantity else 0,
        "threshold_quantity": int(alert.threshold_quantity) if alert.threshold_quantity else 0,
        "is_resolved": alert.is_resolved,
        "resolved_at": str(alert.resolved_at) if alert.resolved_at else None,
        "created_at": alert.created_at
    }


@router.get("/expiry-alerts", response_model=List[ExpiryAlertResponse])
async def get_expiry_alerts(
    resolved: bool = False,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get expiry alerts for perishable products"""
    from uuid import UUID
    
    query = db.query(ExpiryAlert).filter(
        ExpiryAlert.vendor_id == UUID(current_vendor["vendor_id"]),
        ExpiryAlert.is_resolved == resolved
    )
    
    alerts = query.order_by(ExpiryAlert.expiry_date.asc()).all()
    
    # Convert to response format
    return [
        {
            "id": str(a.id),
            "product_id": str(a.product_id),
            "expiry_date": str(a.expiry_date) if a.expiry_date else None,
            "days_until_expiry": a.days_until_expiry,
            "is_resolved": a.is_resolved,
            "created_at": a.created_at
        }
        for a in alerts
    ]


@router.put("/expiry-alerts/{alert_id}/resolve", response_model=ExpiryAlertResponse)
async def resolve_expiry_alert(
    alert_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Mark an expiry alert as resolved"""
    from uuid import UUID
    
    alert = db.query(ExpiryAlert).filter(
        ExpiryAlert.id == UUID(alert_id),
        ExpiryAlert.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(alert)
    
    # Convert to response format
    return {
        "id": str(alert.id),
        "product_id": str(alert.product_id),
        "expiry_date": str(alert.expiry_date) if alert.expiry_date else None,
        "days_until_expiry": alert.days_until_expiry,
        "is_resolved": alert.is_resolved,
        "created_at": alert.created_at
    }

