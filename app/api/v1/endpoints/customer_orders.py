"""
Customer order endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from app.models.product import Product
from app.api.v1.dependencies import get_current_customer
from app.schemas.order import OrderResponse, OrderItemResponse

router = APIRouter(redirect_slashes=False)


@router.get("/")
@router.get("")  # Also accept without trailing slash
async def get_customer_orders(
    skip: int = 0,
    limit: int = 50,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get all orders for current customer. Returns JSON-safe list (no response_model to avoid serialization 500)."""
    from uuid import UUID
    from sqlalchemy.orm import joinedload

    try:
        # Use the same customer record as auth (by id from JWT) so filter matches orders created at checkout
        customer_id_raw = current_customer.get("customer_id")
        if not customer_id_raw:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        try:
            customer_uuid = UUID(str(customer_id_raw).strip())
        except (ValueError, TypeError, AttributeError):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        customer = db.query(Customer).filter(Customer.id == customer_uuid).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Customer not found")

        orders = (
            db.query(Order)
            .options(joinedload(Order.items))
            .filter(Order.customer_id == customer.id)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Get delivery info for all orders (optional - delivery may not exist for all orders)
        deliveries = {}
        try:
            from app.models.driver import Delivery, Driver
            if orders:
                order_ids = [order.id for order in orders]
                delivery_list = db.query(Delivery).filter(Delivery.order_id.in_(order_ids)).all()
                for delivery in delivery_list:
                    deliveries[str(delivery.order_id)] = delivery
        except Exception as e:
            print(f"[customer_orders] Warning: could not load deliveries: {e}")

        orders_list = []
        for order in orders:
            delivery = deliveries.get(str(order.id))
            delivery_info = None
            if delivery:
                delivery_info = {
                    "id": str(delivery.id),
                    "driver_id": str(delivery.driver_id) if getattr(delivery, "driver_id", None) else None,
                    "status": getattr(delivery, "status", None),
                    "current_eta_minutes": getattr(delivery, "current_eta_minutes", None),
                }

            created_at = getattr(order, "created_at", None)
            updated_at = getattr(order, "updated_at", None) or created_at

            # Safely build items list - handle None or missing items
            order_items = getattr(order, "items", None) or []

            order_dict = {
                "id": str(order.id),
                "order_number": getattr(order, "order_number", "") or "",
                "customer_id": str(order.customer_id) if getattr(order, "customer_id", None) else None,
                "chef_id": str(order.chef_id) if getattr(order, "chef_id", None) else None,
                "vendor_id": str(order.vendor_id) if getattr(order, "vendor_id", None) else None,
                "status": getattr(order, "status", None) or "new",
                "delivery_status": delivery_info.get("status") if delivery_info else None,
                "delivery_method": getattr(order, "delivery_method", None) or "delivery",
                "subtotal": _decimal_to_float(getattr(order, "subtotal", None)),
                "tax_amount": _decimal_to_float(getattr(order, "tax_amount", None)),
                "shipping_amount": _decimal_to_float(getattr(order, "shipping_amount", None)),
                "discount_amount": _decimal_to_float(getattr(order, "discount_amount", None)),
                "total_amount": _decimal_to_float(getattr(order, "total_amount", None)),
                "gross_sales": _decimal_to_float(getattr(order, "gross_sales", None)),
                "commission_rate": _decimal_to_float(getattr(order, "commission_rate", None)),
                "commission_amount": _decimal_to_float(getattr(order, "commission_amount", None)),
                "net_payout": _decimal_to_float(getattr(order, "net_payout", None)),
                "payment_status": getattr(order, "payment_status", None) or "pending",
                "special_instructions": getattr(order, "special_instructions", None),
                "customer_notes": getattr(order, "customer_notes", None),
                "created_at": created_at.isoformat() if created_at and hasattr(created_at, "isoformat") else str(created_at or ""),
                "updated_at": updated_at.isoformat() if updated_at and hasattr(updated_at, "isoformat") else str(updated_at or ""),
                "delivery": delivery_info,
                "items": [
                    {
                        "id": str(item.id),
                        "product_id": str(item.product_id) if getattr(item, "product_id", None) else None,
                        "cuisine_id": str(item.cuisine_id) if getattr(item, "cuisine_id", None) else None,
                        "product_name": getattr(item, "product_name", "") or "",
                        "product_price": _decimal_to_float(getattr(item, "product_price", None)),
                        "quantity": getattr(item, "quantity", 0) or 0,
                        "subtotal": _decimal_to_float(getattr(item, "subtotal", None)),
                        "is_substituted": getattr(item, "is_substituted", False),
                        "is_out_of_stock": getattr(item, "is_out_of_stock", False),
                        "quantity_fulfilled": getattr(item, "quantity_fulfilled", 0),
                    }
                    for item in order_items
                ],
            }
            orders_list.append(order_dict)

        return orders_list
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load orders: {str(e)}"
        )


def _decimal_to_float(v):
    """Coerce Decimal to float for JSON-safe response."""
    from decimal import Decimal
    if v is None:
        return 0.0
    if isinstance(v, Decimal):
        return float(v)
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


@router.get("/{order_id}")
async def get_customer_order(
    order_id: str,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get a specific order. Returns JSON-safe dict (no response_model to avoid serialization 500)."""
    from uuid import UUID
    from sqlalchemy.orm import joinedload

    customer_id_raw = current_customer.get("customer_id")
    if not customer_id_raw:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        customer_uuid = UUID(str(customer_id_raw).strip())
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    customer = db.query(Customer).filter(Customer.id == customer_uuid).first()
    if not customer:
        raise HTTPException(status_code=401, detail="Customer not found")

    try:
        order = (
            db.query(Order)
            .options(joinedload(Order.items))
            .filter(Order.id == UUID(order_id), Order.customer_id == customer.id)
            .first()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid order id: {str(e)}")

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    delivery_info = None
    try:
        from app.models.driver import Delivery
        from app.models.driver import Driver
        delivery = db.query(Delivery).filter(Delivery.order_id == order.id).first()
        if delivery:
            driver = db.query(Driver).filter(Driver.id == delivery.driver_id).first() if delivery.driver_id else None
            driver_name = (f"{getattr(driver, 'first_name', '')} {getattr(driver, 'last_name', '')}".strip()) if driver else None
            driver_vehicle = (f"{getattr(driver, 'vehicle_type', '') or ''} {getattr(driver, 'license_plate', '') or ''}".strip() or None) if driver else None
            et = getattr(delivery, "estimated_delivery_time", None)
            at = getattr(delivery, "actual_delivery_time", None)
            delivery_info = {
                "id": str(delivery.id),
                "driver_id": str(delivery.driver_id) if delivery.driver_id else None,
                "driver_name": driver_name,
                "driver_phone": getattr(driver, "phone", None) if driver else None,
                "driver_vehicle": driver_vehicle,
                "status": delivery.status,
                "customer_rating": getattr(delivery, "customer_rating", None),
                "customer_feedback": getattr(delivery, "customer_feedback", None),
                "estimated_delivery_time": et.isoformat() if et else None,
                "actual_delivery_time": at.isoformat() if at else None,
                "current_eta_minutes": getattr(delivery, "current_eta_minutes", None),
            }
    except Exception:
        delivery_info = None

    created_at = order.created_at
    updated_at = getattr(order, "updated_at", None) or created_at
    order_dict = {
        "id": str(order.id),
        "order_number": order.order_number,
        "order_id": str(order.id),
        "customer_id": str(order.customer_id) if order.customer_id else None,
        "chef_id": str(order.chef_id) if getattr(order, "chef_id", None) else None,
        "vendor_id": str(order.vendor_id) if getattr(order, "vendor_id", None) else None,
        "status": order.status,
        "delivery_status": delivery_info.get("status") if delivery_info else None,
        "delivery_method": order.delivery_method,
        "subtotal": _decimal_to_float(order.subtotal),
        "tax_amount": _decimal_to_float(order.tax_amount),
        "shipping_amount": _decimal_to_float(order.shipping_amount),
        "discount_amount": _decimal_to_float(order.discount_amount),
        "total_amount": _decimal_to_float(order.total_amount),
        "gross_sales": _decimal_to_float(order.gross_sales),
        "commission_rate": _decimal_to_float(order.commission_rate),
        "commission_amount": _decimal_to_float(order.commission_amount),
        "net_payout": _decimal_to_float(order.net_payout),
        "payment_status": order.payment_status,
        "payment_method": getattr(order, "payment_method", None),
        "special_instructions": order.special_instructions,
        "customer_notes": order.customer_notes,
        "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
        "updated_at": updated_at.isoformat() if hasattr(updated_at, "isoformat") else str(updated_at),
        "delivery": delivery_info,
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "cuisine_id": str(item.cuisine_id) if getattr(item, "cuisine_id", None) else None,
                "product_name": item.product_name,
                "product_price": _decimal_to_float(item.product_price),
                "quantity": item.quantity,
                "subtotal": _decimal_to_float(item.subtotal),
                "is_substituted": getattr(item, "is_substituted", False),
                "is_out_of_stock": getattr(item, "is_out_of_stock", False),
                "quantity_fulfilled": getattr(item, "quantity_fulfilled", 0),
            }
            for item in order.items
        ]
    }
    return order_dict

