"""
Dashboard and analytics endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from typing import Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.vendor import Vendor
from app.models.inventory import LowStockAlert
from app.schemas.dashboard import DashboardStats, SalesReport, TopProduct
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    vendor_id = current_vendor["vendor_id"]
    today = date.today()
    
    # Today's orders
    today_orders = db.query(func.count(Order.id)).filter(
        Order.vendor_id == vendor_id,
        func.date(Order.created_at) == today
    ).scalar() or 0
    
    # Pending orders (new, accepted, picking)
    pending_orders = db.query(func.count(Order.id)).filter(
        Order.vendor_id == vendor_id,
        Order.status.in_(["new", "accepted", "picking"])
    ).scalar() or 0
    
    # Low stock alerts
    low_stock_alerts = db.query(func.count(LowStockAlert.id)).filter(
        LowStockAlert.vendor_id == vendor_id,
        LowStockAlert.is_resolved == False
    ).scalar() or 0
    
    # Expiring products (within 1 month)
    from uuid import UUID
    one_month_from_now = today + timedelta(days=30)
    expiring_products_count = db.query(func.count(Product.id)).filter(
        Product.vendor_id == UUID(vendor_id),
        Product.track_expiry == True,
        Product.expiry_date.isnot(None),
        Product.expiry_date >= today,
        Product.expiry_date <= one_month_from_now
    ).scalar() or 0
    
    # Today's revenue
    today_revenue = db.query(func.sum(Order.net_payout)).filter(
        Order.vendor_id == vendor_id,
        func.date(Order.created_at) == today,
        Order.status.in_(["picked_up", "delivered"])
    ).scalar() or Decimal(0)
    
    # Week's revenue (last 7 days)
    week_start = today - timedelta(days=7)
    week_revenue = db.query(func.sum(Order.net_payout)).filter(
        Order.vendor_id == vendor_id,
        func.date(Order.created_at) >= week_start,
        Order.status.in_(["picked_up", "delivered"])
    ).scalar() or Decimal(0)
    
    # Month's revenue (last 30 days)
    month_start = today - timedelta(days=30)
    month_revenue = db.query(func.sum(Order.net_payout)).filter(
        Order.vendor_id == vendor_id,
        func.date(Order.created_at) >= month_start,
        Order.status.in_(["picked_up", "delivered"])
    ).scalar() or Decimal(0)
    
    # Vendor rating
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    average_rating = vendor.average_rating if vendor else None
    total_reviews = vendor.total_reviews if vendor else 0
    
    return DashboardStats(
        today_orders=today_orders,
        pending_orders=pending_orders,
        low_stock_alerts=low_stock_alerts,
        expiring_products_count=expiring_products_count,
        today_revenue=Decimal(str(today_revenue)),
        week_revenue=Decimal(str(week_revenue)),
        month_revenue=Decimal(str(month_revenue)),
        average_rating=average_rating,
        total_reviews=total_reviews
    )


@router.get("/sales-report", response_model=SalesReport)
async def get_sales_report(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get sales report for a date range"""
    vendor_id = current_vendor["vendor_id"]
    
    # Get orders in date range
    orders = db.query(Order).filter(
        Order.vendor_id == vendor_id,
        func.date(Order.created_at) >= start_date,
        func.date(Order.created_at) <= end_date,
        Order.status.in_(["picked_up", "delivered"])
    ).all()
    
    total_orders = len(orders)
    total_revenue = sum(order.gross_sales for order in orders)
    total_commission = sum(order.commission_amount for order in orders)
    net_payout = sum(order.net_payout for order in orders)
    average_order_value = total_revenue / total_orders if total_orders > 0 else Decimal(0)
    
    # Top products
    order_items = db.query(
        OrderItem.product_id,
        Product.name,
        func.sum(OrderItem.quantity).label('total_sold'),
        func.sum(OrderItem.subtotal).label('revenue')
    ).join(
        Order, OrderItem.order_id == Order.id
    ).join(
        Product, OrderItem.product_id == Product.id, isouter=True
    ).filter(
        Order.vendor_id == vendor_id,
        func.date(Order.created_at) >= start_date,
        func.date(Order.created_at) <= end_date,
        Order.status.in_(["picked_up", "delivered"])
    ).group_by(
        OrderItem.product_id, Product.name
    ).order_by(
        func.sum(OrderItem.subtotal).desc()
    ).limit(10).all()
    
    top_products = [
        TopProduct(
            product_id=str(item.product_id) if item.product_id else "",
            product_name=item.name or "Unknown",
            total_sold=int(item.total_sold or 0),
            revenue=Decimal(str(item.revenue or 0))
        )
        for item in order_items
    ]
    
    return SalesReport(
        period_start=start_date,
        period_end=end_date,
        total_orders=total_orders,
        total_revenue=Decimal(str(total_revenue)),
        total_commission=Decimal(str(total_commission)),
        net_payout=Decimal(str(net_payout)),
        average_order_value=Decimal(str(average_order_value)),
        top_products=top_products
    )

