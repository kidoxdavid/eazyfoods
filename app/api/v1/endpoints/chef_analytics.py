"""
Chef analytics: orders, revenue, cuisine breakdown
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.cuisine import Cuisine
from app.api.v1.dependencies import get_current_chef

router = APIRouter()


@router.get("/summary", response_model=dict)
async def get_chef_analytics_summary(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Order and revenue summary for date range; optional cuisine breakdown."""
    chef_id = UUID(current_chef["chef_id"])

    orders = db.query(Order).filter(
        Order.chef_id == chef_id,
        func.date(Order.created_at) >= start_date,
        func.date(Order.created_at) <= end_date,
        Order.status.in_(["picked_up", "delivered"]),
    ).all()

    total_orders = len(orders)
    total_revenue = sum(o.gross_sales for o in orders)
    total_commission = sum(o.commission_amount for o in orders)
    net_payout = sum(o.net_payout for o in orders)
    avg_order = (total_revenue / total_orders) if total_orders else Decimal(0)

    # By cuisine (from order items)
    rows = db.query(
        OrderItem.cuisine_id,
        Cuisine.name,
        func.count(OrderItem.id).label("order_lines"),
        func.sum(OrderItem.subtotal).label("revenue"),
    ).join(
        Order, OrderItem.order_id == Order.id
    ).outerjoin(
        Cuisine, OrderItem.cuisine_id == Cuisine.id
    ).filter(
        Order.chef_id == chef_id,
        func.date(Order.created_at) >= start_date,
        func.date(Order.created_at) <= end_date,
        Order.status.in_(["picked_up", "delivered"]),
    ).group_by(
        OrderItem.cuisine_id, Cuisine.name
    ).all()

    by_cuisine = [
        {
            "cuisine_id": str(r.cuisine_id) if r.cuisine_id else None,
            "cuisine_name": r.name or "Other",
            "order_lines": r.order_lines or 0,
            "revenue": float(r.revenue or 0),
        }
        for r in rows
    ]

    return {
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat(),
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "total_commission": float(total_commission),
        "net_payout": float(net_payout),
        "average_order_value": float(avg_order),
        "by_cuisine": by_cuisine,
        "currency": "USD",
    }
