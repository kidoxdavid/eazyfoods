"""
Chef dashboard stats
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID
from app.core.database import get_db
from app.models.order import Order
from app.api.v1.dependencies import get_current_chef

router = APIRouter()


@router.get("/stats", response_model=dict)
async def get_chef_dashboard_stats(
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Dashboard statistics for chef: today's orders, pending orders, revenue."""
    chef_id = UUID(current_chef["chef_id"])
    today = date.today()

    today_orders = db.query(func.count(Order.id)).filter(
        Order.chef_id == chef_id,
        func.date(Order.created_at) == today,
    ).scalar() or 0

    pending_orders = db.query(func.count(Order.id)).filter(
        Order.chef_id == chef_id,
        Order.status.in_(["new", "accepted", "picking", "ready"]),
    ).scalar() or 0

    today_revenue = db.query(func.coalesce(func.sum(Order.net_payout), 0)).filter(
        Order.chef_id == chef_id,
        func.date(Order.created_at) == today,
        Order.status.in_(["picked_up", "delivered"]),
    ).scalar() or Decimal(0)

    week_start = today - timedelta(days=7)
    week_revenue = db.query(func.coalesce(func.sum(Order.net_payout), 0)).filter(
        Order.chef_id == chef_id,
        func.date(Order.created_at) >= week_start,
        Order.status.in_(["picked_up", "delivered"]),
    ).scalar() or Decimal(0)

    month_start = today - timedelta(days=30)
    month_revenue = db.query(func.coalesce(func.sum(Order.net_payout), 0)).filter(
        Order.chef_id == chef_id,
        func.date(Order.created_at) >= month_start,
        Order.status.in_(["picked_up", "delivered"]),
    ).scalar() or Decimal(0)

    return {
        "today_orders": today_orders,
        "pending_orders": pending_orders,
        "today_revenue": float(today_revenue),
        "week_revenue": float(week_revenue),
        "month_revenue": float(month_revenue),
        "currency": "USD",
    }
