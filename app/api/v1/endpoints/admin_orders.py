"""
Admin order management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
# Import models in correct order to ensure relationship resolution
from app.models.product import Product
from app.models.vendor import Vendor
from app.models.customer import Customer
# Import Order after Product and Vendor to ensure relationships work
from app.models.order import Order, OrderItem
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_orders(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    vendor_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all orders across all vendors"""
    try:
        query = db.query(Order).options(joinedload(Order.items))
        
        if status_filter:
            query = query.filter(Order.status == status_filter)
        
        if vendor_id:
            query = query.filter(Order.vendor_id == UUID(vendor_id))
        
        if customer_id:
            query = query.filter(Order.customer_id == UUID(customer_id))
        
        orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
        
        result = []
        for order in orders:
            try:
                vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
                customer = db.query(Customer).filter(Customer.id == order.customer_id).first() if order.customer_id else None
                
                result.append({
                    "id": str(order.id),
                    "order_number": order.order_number,
                    "vendor_id": str(order.vendor_id),
                    "vendor_name": vendor.business_name if vendor else None,
                    "customer_id": str(order.customer_id) if order.customer_id else None,
                    "customer_name": f"{customer.first_name} {customer.last_name}" if customer else None,
                    "status": order.status,
                    "total_amount": float(order.total_amount),
                    "payment_status": order.payment_status,
                    "created_at": order.created_at,
                    "items_count": len(order.items) if order.items else 0
                })
            except Exception as e:
                import traceback
                print(f"Error processing order {order.id}: {e}")
                traceback.print_exc()
                continue
        
        return result
    except Exception as e:
        import traceback
        error_msg = f"Error in get_all_orders: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.get("/{order_id}", response_model=dict)
async def get_order_detail(
    order_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed order information"""
    # Validate UUID format
    try:
        order_uuid = UUID(order_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid order ID format: {str(e)}"
        )
    
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_uuid).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "vendor_id": str(order.vendor_id),
        "vendor_name": vendor.business_name if vendor else None,
        "customer_id": str(order.customer_id) if order.customer_id else None,
        "customer_name": f"{customer.first_name} {customer.last_name}" if customer else None,
        "customer_email": customer.email if customer else None,
        "status": order.status,
        "delivery_method": order.delivery_method,
        "subtotal": float(order.subtotal),
        "tax_amount": float(order.tax_amount),
        "shipping_amount": float(order.shipping_amount),
        "discount_amount": float(order.discount_amount),
        "total_amount": float(order.total_amount),
        "payment_status": order.payment_status,
        "items": [
            {
                "id": str(item.id),
                "product_name": item.product_name,
                "quantity": item.quantity,
                "product_price": float(item.product_price),
                "subtotal": float(item.subtotal)
            }
            for item in order.items
        ],
        "created_at": order.created_at,
        "updated_at": order.updated_at
    }


@router.put("/{order_id}/refund")
async def refund_order(
    order_id: str,
    refund_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Process a refund for an order"""
    # Validate UUID format
    try:
        order_uuid = UUID(order_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid order ID format: {str(e)}"
        )
    
    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update order status
    order.status = "refunded"
    order.payment_status = "refunded"
    db.commit()
    
    # Log activity
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="order_refunded",
        entity_type="order",
        entity_id=order.id,
        details={
            "order_number": order.order_number,
            "refund_amount": refund_data.get("amount", order.total_amount),
            "reason": refund_data.get("reason", "")
        }
    )
    db.add(log)
    db.commit()
    
    return {"message": "Order refunded successfully"}


@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update order status"""
    # Validate UUID format
    try:
        order_uuid = UUID(order_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid order ID format: {str(e)}"
        )
    
    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    new_status = status_data.get("status")
    if new_status:
        order.status = new_status
        from datetime import datetime
        order.updated_at = datetime.utcnow()
        db.commit()
        
        # Log activity
        from app.models.admin import AdminActivityLog
        log = AdminActivityLog(
            admin_id=UUID(current_admin["admin_id"]),
            action="order_status_updated",
            entity_type="order",
            entity_id=order.id,
            details={
                "order_number": order.order_number,
                "old_status": order.status,
                "new_status": new_status
            }
        )
        db.add(log)
        db.commit()
    
    return {"message": "Order status updated successfully"}

