"""
Analytics and detailed reports endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case, extract
from typing import Optional, List
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.dashboard import SalesReport, TopProduct
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.get("/sales-report", response_model=SalesReport)
async def get_sales_report(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get detailed sales report for a date range"""
    from uuid import UUID
    
    vendor_id = UUID(current_vendor["vendor_id"])
    
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


@router.get("/sales-trends", response_model=dict)
async def get_sales_trends(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    group_by: str = Query("day", description="Group by: day, week, month"),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get sales trends over time"""
    from uuid import UUID
    
    vendor_id = UUID(current_vendor["vendor_id"])
    
    if group_by == "week":
        query = db.query(
            extract('year', Order.created_at).label('year'),
            extract('week', Order.created_at).label('week'),
            func.count(Order.id).label('order_count'),
            func.sum(Order.gross_sales).label('revenue'),
            func.sum(Order.net_payout).label('net_payout')
        ).filter(
            Order.vendor_id == vendor_id,
            func.date(Order.created_at) >= start_date,
            func.date(Order.created_at) <= end_date,
            Order.status.in_(["picked_up", "delivered"])
        ).group_by(
            extract('year', Order.created_at),
            extract('week', Order.created_at)
        ).order_by(
            extract('year', Order.created_at),
            extract('week', Order.created_at)
        )
        
        results = query.all()
        trends = []
        for r in results:
            trends.append({
                "date": f"Week {int(r.week)}, {int(r.year)}",
                "order_count": int(r.order_count or 0),
                "revenue": float(r.revenue or 0),
                "net_payout": float(r.net_payout or 0)
            })
    elif group_by == "month":
        query = db.query(
            extract('year', Order.created_at).label('year'),
            extract('month', Order.created_at).label('month'),
            func.count(Order.id).label('order_count'),
            func.sum(Order.gross_sales).label('revenue'),
            func.sum(Order.net_payout).label('net_payout')
        ).filter(
            Order.vendor_id == vendor_id,
            func.date(Order.created_at) >= start_date,
            func.date(Order.created_at) <= end_date,
            Order.status.in_(["picked_up", "delivered"])
        ).group_by(
            extract('year', Order.created_at),
            extract('month', Order.created_at)
        ).order_by(
            extract('year', Order.created_at),
            extract('month', Order.created_at)
        )
        
        results = query.all()
        month_names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        trends = []
        for r in results:
            trends.append({
                "date": f"{month_names[int(r.month)]} {int(r.year)}",
                "order_count": int(r.order_count or 0),
                "revenue": float(r.revenue or 0),
                "net_payout": float(r.net_payout or 0)
            })
    else:  # day
        query = db.query(
            func.date(Order.created_at).label('date'),
            func.count(Order.id).label('order_count'),
            func.sum(Order.gross_sales).label('revenue'),
            func.sum(Order.net_payout).label('net_payout')
        ).filter(
            Order.vendor_id == vendor_id,
            func.date(Order.created_at) >= start_date,
            func.date(Order.created_at) <= end_date,
            Order.status.in_(["picked_up", "delivered"])
        ).group_by(
            func.date(Order.created_at)
        ).order_by(
            func.date(Order.created_at)
        )
        
        results = query.all()
        trends = []
        for r in results:
            trends.append({
                "date": str(r.date),
                "order_count": int(r.order_count or 0),
                "revenue": float(r.revenue or 0),
                "net_payout": float(r.net_payout or 0)
            })
    
    return {"trends": trends, "group_by": group_by}


@router.get("/revenue-breakdown", response_model=dict)
async def get_revenue_breakdown(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get revenue breakdown by category"""
    from uuid import UUID
    from app.models.product import Category
    
    vendor_id = UUID(current_vendor["vendor_id"])
    
    results = db.query(
        Product.category_id,
        Category.name.label('category_name'),
        func.sum(OrderItem.subtotal).label('revenue'),
        func.sum(OrderItem.quantity).label('quantity')
    ).join(
        OrderItem, Product.id == OrderItem.product_id
    ).join(
        Order, OrderItem.order_id == Order.id
    ).outerjoin(
        Category, Product.category_id == Category.id
    ).filter(
        Product.vendor_id == vendor_id,
        func.date(Order.created_at) >= start_date,
        func.date(Order.created_at) <= end_date,
        Order.status.in_(["picked_up", "delivered"])
    ).group_by(
        Product.category_id, Category.name
    ).all()
    
    breakdown = [
        {
            "category_id": str(r.category_id) if r.category_id else "uncategorized",
            "category_name": r.category_name or "Uncategorized",
            "revenue": float(r.revenue or 0),
            "quantity": int(r.quantity or 0)
        }
        for r in results
    ]
    
    return {"breakdown": breakdown}


@router.get("/product-performance", response_model=dict)
async def get_product_performance(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 20,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get product performance analytics"""
    from uuid import UUID
    
    vendor_id = UUID(current_vendor["vendor_id"])
    
    query = db.query(
        Product.id,
        Product.name,
        func.sum(OrderItem.quantity).label('total_sold'),
        func.sum(OrderItem.subtotal).label('revenue'),
        func.count(OrderItem.order_id.distinct()).label('order_count')
    ).join(
        OrderItem, Product.id == OrderItem.product_id
    ).join(
        Order, OrderItem.order_id == Order.id
    ).filter(
        Product.vendor_id == vendor_id,
        Order.status.in_(["picked_up", "delivered"])
    )
    
    if start_date:
        query = query.filter(func.date(Order.created_at) >= start_date)
    if end_date:
        query = query.filter(func.date(Order.created_at) <= end_date)
    
    results = query.group_by(
        Product.id, Product.name
    ).order_by(
        func.sum(OrderItem.subtotal).desc()
    ).limit(limit).all()
    
    products = [
        {
            "product_id": str(r.id),
            "product_name": r.name,
            "total_sold": int(r.total_sold or 0),
            "revenue": float(r.revenue or 0),
            "order_count": int(r.order_count or 0)
        }
        for r in results
    ]
    
    return {"products": products}


@router.get("/fulfillment-metrics", response_model=dict)
async def get_fulfillment_metrics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get order fulfillment metrics"""
    from uuid import UUID
    
    vendor_id = UUID(current_vendor["vendor_id"])
    
    query = db.query(Order).filter(Order.vendor_id == vendor_id)
    
    if start_date:
        query = query.filter(func.date(Order.created_at) >= start_date)
    if end_date:
        query = query.filter(func.date(Order.created_at) <= end_date)
    
    orders = query.all()
    
    completed_orders = [o for o in orders if o.status in ["picked_up", "delivered"]]
    cancelled_orders = [o for o in orders if o.status == "cancelled"]
    
    # Calculate average fulfillment time
    fulfillment_times = []
    for order in completed_orders:
        if order.accepted_at and order.ready_at:
            delta = order.ready_at - order.accepted_at
            fulfillment_times.append(delta.total_seconds() / 60)  # minutes
    
    avg_fulfillment_time = sum(fulfillment_times) / len(fulfillment_times) if fulfillment_times else 0
    cancellation_rate = (len(cancelled_orders) / len(orders) * 100) if orders else 0
    
    # Status breakdown
    status_counts = {}
    for order in orders:
        status_counts[order.status] = status_counts.get(order.status, 0) + 1
    
    return {
        "total_orders": len(orders),
        "completed_orders": len(completed_orders),
        "cancelled_orders": len(cancelled_orders),
        "cancellation_rate": round(cancellation_rate, 2),
        "average_fulfillment_time_minutes": round(avg_fulfillment_time, 2),
        "status_breakdown": status_counts
    }


@router.get("/comparison", response_model=dict)
async def get_period_comparison(
    period1_start: date = Query(..., description="Period 1 start date"),
    period1_end: date = Query(..., description="Period 1 end date"),
    period2_start: date = Query(..., description="Period 2 start date"),
    period2_end: date = Query(..., description="Period 2 end date"),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Compare two time periods"""
    from uuid import UUID
    
    vendor_id = UUID(current_vendor["vendor_id"])
    
    def get_period_stats(start, end):
        orders = db.query(Order).filter(
            Order.vendor_id == vendor_id,
            func.date(Order.created_at) >= start,
            func.date(Order.created_at) <= end,
            Order.status.in_(["picked_up", "delivered"])
        ).all()
        
        return {
            "total_orders": len(orders),
            "total_revenue": float(sum(order.gross_sales for order in orders)),
            "net_payout": float(sum(order.net_payout for order in orders)),
            "avg_order_value": float(sum(order.gross_sales for order in orders) / len(orders)) if orders else 0
        }
    
    period1 = get_period_stats(period1_start, period1_end)
    period2 = get_period_stats(period2_start, period2_end)
    
    # Calculate changes
    def calc_change(old, new_val):
        if old == 0:
            return 100 if new_val > 0 else 0
        return ((new_val - old) / old) * 100
    
    return {
        "period1": period1,
        "period2": period2,
        "changes": {
            "orders": calc_change(period1["total_orders"], period2["total_orders"]),
            "revenue": calc_change(period1["total_revenue"], period2["total_revenue"]),
            "payout": calc_change(period1["net_payout"], period2["net_payout"]),
            "avg_order_value": calc_change(period1["avg_order_value"], period2["avg_order_value"])
        }
    }
