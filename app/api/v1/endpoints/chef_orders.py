"""
Chef order management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date
from app.core.database import get_db
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.schemas.order import OrderResponse, OrderUpdate, OrderListResponse
from app.api.v1.dependencies import get_current_chef

router = APIRouter()


@router.get("/", response_model=List[OrderListResponse])
async def get_chef_orders(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = Query(None, alias="status"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get all orders for current chef with filters"""
    from uuid import UUID
    
    chef_id = UUID(current_chef["chef_id"])
    query = db.query(Order).filter(Order.chef_id == chef_id)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    if start_date:
        query = query.filter(func.date(Order.created_at) >= start_date)
    
    if end_date:
        query = query.filter(func.date(Order.created_at) <= end_date)
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    # Convert to list of dicts to ensure proper serialization
    orders_list = []
    for order in orders:
        order_dict = {
            "id": str(order.id),
            "order_number": order.order_number,
            "status": order.status,
            "total_amount": float(order.total_amount) if order.total_amount else 0,
            "payment_status": order.payment_status,
            "created_at": order.created_at.isoformat() if order.created_at else None
        }
        orders_list.append(order_dict)
    
    return orders_list


@router.get("/{order_id}", response_model=OrderResponse)
async def get_chef_order(
    order_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get a specific order with items"""
    from uuid import UUID
    
    chef_id = UUID(current_chef["chef_id"])
    order_id_uuid = UUID(order_id)
    
    order = db.query(Order).options(
        joinedload(Order.items)
    ).filter(
        Order.id == order_id_uuid,
        Order.chef_id == chef_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Get driver information if assigned
    driver_info = None
    delivery_info = None
    if order.driver_id:
        from app.models.driver import Driver, Delivery
        driver = db.query(Driver).filter(Driver.id == order.driver_id).first()
        if driver:
            driver_info = {
                "id": str(driver.id),
                "name": f"{driver.first_name} {driver.last_name}",
                "phone": driver.phone,
                "vehicle_type": driver.vehicle_type,
                "license_plate": driver.license_plate
            }
        
        # Get delivery record if exists
        delivery = db.query(Delivery).filter(Delivery.order_id == order.id).first()
        if delivery:
            delivery_info = {
                "id": str(delivery.id),
                "status": delivery.status,
                "accepted_at": delivery.accepted_at.isoformat() if delivery.accepted_at else None,
                "picked_up_at": delivery.actual_pickup_time.isoformat() if delivery.actual_pickup_time else None,
                "delivered_at": delivery.actual_delivery_time.isoformat() if delivery.actual_delivery_time else None,
                "estimated_pickup_time": delivery.estimated_pickup_time.isoformat() if delivery.estimated_pickup_time else None,
                "estimated_delivery_time": delivery.estimated_delivery_time.isoformat() if delivery.estimated_delivery_time else None,
                "distance_km": float(delivery.distance_km) if delivery.distance_km else None
            }
    
    # Convert to dict with items
    order_dict = {
        "id": str(order.id),
        "order_number": order.order_number,
        "customer_id": str(order.customer_id) if order.customer_id else None,
        "status": order.status,
        "delivery_method": order.delivery_method,
        "subtotal": float(order.subtotal) if order.subtotal else 0,
        "tax_amount": float(order.tax_amount) if order.tax_amount else 0,
        "shipping_amount": float(order.shipping_amount) if order.shipping_amount else 0,
        "discount_amount": float(order.discount_amount) if order.discount_amount else 0,
        "total_amount": float(order.total_amount) if order.total_amount else 0,
        "gross_sales": float(order.gross_sales) if order.gross_sales else 0,
        "commission_rate": float(order.commission_rate) if order.commission_rate else 0,
        "commission_amount": float(order.commission_amount) if order.commission_amount else 0,
        "net_payout": float(order.net_payout) if order.net_payout else 0,
        "payment_status": order.payment_status,
        "special_instructions": order.special_instructions,
        "customer_notes": order.customer_notes,
        "driver_id": str(order.driver_id) if order.driver_id else None,
        "driver": driver_info,
        "delivery": delivery_info,
        "ready_at": order.ready_at.isoformat() if order.ready_at else None,
        "picked_up_at": order.picked_up_at.isoformat() if order.picked_up_at else None,
        "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "cuisine_id": str(item.cuisine_id) if item.cuisine_id else None,
                "product_name": item.product_name,
                "product_price": float(item.product_price) if item.product_price else 0,
                "quantity": item.quantity,
                "subtotal": float(item.subtotal) if item.subtotal else 0,
                "is_substituted": item.is_substituted,
                "is_out_of_stock": item.is_out_of_stock,
                "quantity_fulfilled": item.quantity_fulfilled
            }
            for item in order.items
        ]
    }
    
    return order_dict


@router.put("/{order_id}/accept", response_model=OrderResponse)
async def accept_chef_order(
    order_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Accept an order (change status from 'new' to 'accepted')"""
    from uuid import UUID
    
    chef_id = UUID(current_chef["chef_id"])
    order_id_uuid = UUID(order_id)
    
    order = db.query(Order).filter(
        Order.id == order_id_uuid,
        Order.chef_id == chef_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status != "new":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be accepted. Current status: {order.status}"
        )
    
    order.status = "accepted"
    order.accepted_at = datetime.utcnow()
    
    # Add to status history
    status_history = OrderStatusHistory(
        order_id=order.id,
        status="accepted",
        changed_by=None,  # Chef orders don't have vendor_users
        notes="Order accepted by chef"
    )
    db.add(status_history)
    
    db.commit()
    db.refresh(order)
    
    # Return serialized order
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status,
        "total_amount": float(order.total_amount) if order.total_amount else 0,
        "payment_status": order.payment_status,
        "created_at": order.created_at.isoformat() if order.created_at else None
    }


@router.put("/{order_id}/mark-ready", response_model=OrderResponse)
async def mark_chef_order_ready(
    order_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Mark order as ready for pickup/delivery"""
    from uuid import UUID
    
    chef_id = UUID(current_chef["chef_id"])
    order_id_uuid = UUID(order_id)
    
    order = db.query(Order).filter(
        Order.id == order_id_uuid,
        Order.chef_id == chef_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status not in ["accepted", "new"]:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be marked ready. Current status: {order.status}"
        )
    
    order.status = "ready"
    order.ready_at = datetime.utcnow()
    
    status_history = OrderStatusHistory(
        order_id=order.id,
        status="ready",
        changed_by=None,
        notes="Order ready for pickup/delivery"
    )
    db.add(status_history)
    
    db.commit()
    db.refresh(order)
    
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status,
        "total_amount": float(order.total_amount) if order.total_amount else 0,
        "payment_status": order.payment_status,
        "created_at": order.created_at.isoformat() if order.created_at else None
    }


@router.put("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_chef_order(
    order_id: str,
    cancellation_reason: Optional[str] = None,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Cancel an order"""
    from uuid import UUID
    
    chef_id = UUID(current_chef["chef_id"])
    order_id_uuid = UUID(order_id)
    
    order = db.query(Order).filter(
        Order.id == order_id_uuid,
        Order.chef_id == chef_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status in ["picked_up", "delivered", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be cancelled. Current status: {order.status}"
        )
    
    order.status = "cancelled"
    order.cancelled_at = datetime.utcnow()
    order.cancellation_reason = cancellation_reason
    
    status_history = OrderStatusHistory(
        order_id=order.id,
        status="cancelled",
        changed_by=None,
        notes=f"Cancelled: {cancellation_reason or 'No reason provided'}"
    )
    db.add(status_history)
    
    db.commit()
    db.refresh(order)
    
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status,
        "total_amount": float(order.total_amount) if order.total_amount else 0,
        "payment_status": order.payment_status,
        "created_at": order.created_at.isoformat() if order.created_at else None
    }




