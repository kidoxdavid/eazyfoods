"""
Order management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID
from app.core.database import get_db
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.product import Product
from app.models.vendor import Vendor
from app.models.driver import Delivery
from app.schemas.order import OrderResponse, OrderUpdate, OrderListResponse
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


def _decimal(val):
    """Convert Decimal to float for JSON; leave None as None."""
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _order_to_response(order, db: Session, vendor_id: UUID):
    """Build JSON-serializable order dict for vendor (used by GET and PUT so responses don't fail)."""
    from app.models.driver import Driver, Delivery
    driver_info = None
    delivery_info = None
    if order.driver_id:
        driver = db.query(Driver).filter(Driver.id == order.driver_id).first()
        if driver:
            driver_info = {
                "id": str(driver.id),
                "name": f"{driver.first_name} {driver.last_name}",
                "phone": driver.phone,
                "vehicle_type": driver.vehicle_type,
                "license_plate": driver.license_plate
            }
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
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    vendor_commission_rate = float(vendor.commission_rate) if vendor and vendor.commission_rate is not None else None
    gross = _decimal(order.gross_sales)
    # Show commission from vendor's current Admin rate so vendor portal matches Admin
    if vendor_commission_rate is not None and gross is not None:
        commission_rate = vendor_commission_rate
        commission_amount = round(gross * (vendor_commission_rate / 100), 2)
        net_payout = round(gross - commission_amount, 2)
    else:
        commission_rate = _decimal(order.commission_rate)
        commission_amount = _decimal(order.commission_amount)
        net_payout = _decimal(order.net_payout)
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "customer_id": str(order.customer_id) if order.customer_id else None,
        "status": order.status,
        "delivery_method": order.delivery_method,
        "subtotal": _decimal(order.subtotal),
        "tax_amount": _decimal(order.tax_amount),
        "shipping_amount": _decimal(order.shipping_amount),
        "discount_amount": _decimal(order.discount_amount),
        "total_amount": _decimal(order.total_amount),
        "gross_sales": gross,
        "commission_rate": commission_rate,
        "commission_amount": commission_amount,
        "net_payout": net_payout,
        "payment_status": order.payment_status,
        "special_instructions": order.special_instructions,
        "customer_notes": order.customer_notes,
        "driver_id": str(order.driver_id) if order.driver_id else None,
        "driver": driver_info,
        "delivery": delivery_info,
        "ready_at": order.ready_at.isoformat() if order.ready_at else None,
        "picked_up_at": order.picked_up_at.isoformat() if order.picked_up_at else None,
        "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
        "created_at": order.created_at.isoformat() if hasattr(order.created_at, "isoformat") else order.created_at,
        "updated_at": order.updated_at.isoformat() if order.updated_at and hasattr(order.updated_at, "isoformat") else order.updated_at,
        "vendor_commission_rate": vendor_commission_rate,
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "product_name": item.product_name,
                "product_price": _decimal(item.product_price),
                "quantity": item.quantity,
                "subtotal": _decimal(item.subtotal),
                "is_substituted": item.is_substituted,
                "is_out_of_stock": item.is_out_of_stock,
                "quantity_fulfilled": item.quantity_fulfilled
            }
            for item in order.items
        ]
    }


@router.get("/", response_model=List[OrderListResponse])
async def get_orders(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = Query(None, alias="status"),
    delivery_method: Optional[str] = Query(None, description="Filter by delivery_method: pickup or delivery"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get all orders for current vendor with filters. Use delivery_method=pickup or delivery for Orders tabs."""
    from uuid import UUID

    vendor_id = UUID(current_vendor["vendor_id"])
    query = db.query(Order).filter(Order.vendor_id == vendor_id)

    if status_filter:
        query = query.filter(Order.status == status_filter)
    if delivery_method and delivery_method in ("pickup", "delivery"):
        query = query.filter(Order.delivery_method == delivery_method)
    if start_date:
        query = query.filter(func.date(Order.created_at) >= start_date)
    if end_date:
        query = query.filter(func.date(Order.created_at) <= end_date)

    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    order_ids = [o.id for o in orders]
    deliveries_by_order = {}
    try:
        if order_ids:
            for d in db.query(Delivery).filter(Delivery.order_id.in_(order_ids)).all():
                deliveries_by_order[d.order_id] = d
    except Exception:
        pass

    orders_list = []
    for order in orders:
        delivery_status = None
        method = (order.delivery_method or "").strip().lower()
        if method == "delivery":
            if order.status == "ready" and not order.driver_id:
                delivery_status = "awaiting_driver"
            elif order.driver_id and order.id in deliveries_by_order:
                delivery_status = deliveries_by_order[order.id].status
            else:
                delivery_status = order.status if order.status in ("picked_up", "delivered") else None
        order_dict = {
            "id": str(order.id),
            "order_number": order.order_number,
            "status": order.status,
            "total_amount": order.total_amount,
            "payment_status": order.payment_status,
            "created_at": order.created_at,
            "delivery_method": method if method else "delivery",
            "delivery_status": delivery_status,
        }
        orders_list.append(order_dict)

    return orders_list


@router.get("/{order_id}")
async def get_order(
    order_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get a specific order with items"""
    vendor_id = UUID(current_vendor["vendor_id"])
    order_id_uuid = UUID(order_id)
    order = db.query(Order).options(joinedload(Order.items)).filter(
        Order.id == order_id_uuid,
        Order.vendor_id == vendor_id
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _order_to_response(order, db, vendor_id)


@router.put("/{order_id}/accept")
async def accept_order(
    order_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Accept an order (change status from 'new' to 'accepted')"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.vendor_id == current_vendor["vendor_id"]
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
    if current_vendor.get("user_id"):
        order.accepted_by = current_vendor["user_id"]
    
    # Add to status history
    status_history = OrderStatusHistory(
        order_id=order.id,
        status="accepted",
        changed_by=current_vendor.get("user_id"),
        notes="Order accepted by vendor"
    )
    db.add(status_history)
    
    db.commit()
    db.refresh(order)
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order.id).first()
    return _order_to_response(order, db, UUID(current_vendor["vendor_id"]))


@router.put("/{order_id}/start-picking")
async def start_picking(
    order_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Start picking an order"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.vendor_id == current_vendor["vendor_id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != "accepted":
        raise HTTPException(
            status_code=400,
            detail=f"Order must be accepted first. Current status: {order.status}"
        )
    
    order.status = "picking"
    order.picking_started_at = datetime.utcnow()
    
    status_history = OrderStatusHistory(
        order_id=order.id,
        status="picking",
        changed_by=current_vendor.get("user_id"),
        notes="Picking started"
    )
    db.add(status_history)
    db.commit()
    db.refresh(order)
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order.id).first()
    return _order_to_response(order, db, UUID(current_vendor["vendor_id"]))


@router.put("/{order_id}/mark-ready")
async def mark_order_ready(
    order_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Mark order as ready for pickup/delivery"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.vendor_id == current_vendor["vendor_id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status not in ["picking", "accepted"]:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be marked ready. Current status: {order.status}"
        )
    
    order.status = "ready"
    order.picking_completed_at = datetime.utcnow()
    order.ready_at = datetime.utcnow()
    
    status_history = OrderStatusHistory(
        order_id=order.id,
        status="ready",
        changed_by=current_vendor.get("user_id"),
        notes="Order ready for pickup/delivery"
    )
    db.add(status_history)
    db.commit()
    db.refresh(order)
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order.id).first()
    return _order_to_response(order, db, UUID(current_vendor["vendor_id"]))


@router.put("/{order_id}/complete")
async def complete_order(
    order_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Mark order as completed (picked up or delivered)"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.vendor_id == current_vendor["vendor_id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != "ready":
        raise HTTPException(
            status_code=400,
            detail=f"Order must be ready first. Current status: {order.status}"
        )

    # Delivery orders: status is updated only by the driver (accept → picked_up → delivered)
    if order.delivery_method == "delivery":
        raise HTTPException(
            status_code=400,
            detail="Delivery order status is updated by the driver. Track progress in Deliveries."
        )

    if order.delivery_method == "pickup":
        order.status = "picked_up"
        order.picked_up_at = datetime.utcnow()
    else:
        order.status = "delivered"
        order.delivered_at = datetime.utcnow()
    
    status_history = OrderStatusHistory(
        order_id=order.id,
        status=order.status,
        changed_by=current_vendor.get("user_id"),
        notes=f"Order {order.status}"
    )
    db.add(status_history)
    db.commit()
    db.refresh(order)
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order.id).first()
    return _order_to_response(order, db, UUID(current_vendor["vendor_id"]))


@router.put("/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    cancellation_reason: Optional[str] = None,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Cancel an order"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.vendor_id == current_vendor["vendor_id"]
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
    if current_vendor.get("user_id"):
        order.cancelled_by = current_vendor["user_id"]
    
    status_history = OrderStatusHistory(
        order_id=order.id,
        status="cancelled",
        changed_by=current_vendor.get("user_id"),
        notes=f"Cancelled: {cancellation_reason or 'No reason provided'}"
    )
    db.add(status_history)
    db.commit()
    db.refresh(order)
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order.id).first()
    return _order_to_response(order, db, UUID(current_vendor["vendor_id"]))


@router.put("/{order_id}")
async def update_order(
    order_id: str,
    order_update: OrderUpdate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Update order details"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.vendor_id == current_vendor["vendor_id"]
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = order_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order.id).first()
    return _order_to_response(order, db, UUID(current_vendor["vendor_id"]))

