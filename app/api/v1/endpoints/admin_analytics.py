"""
Admin analytics endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from datetime import datetime, timedelta, date
from typing import Optional
from app.core.database import get_db
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order
from app.models.admin import AdminUser
from app.models.driver import Driver, Delivery
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get comprehensive analytics overview"""
    # Default to last 30 days if not provided
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
    if not end_date:
        end_date = datetime.utcnow().isoformat()
    
    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    # Revenue trends
    revenue_trends = db.query(
        func.date(Order.created_at).label('date'),
        func.sum(Order.total_amount).label('revenue'),
        func.count(Order.id).label('orders')
    ).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at)).all()
    
    # Top vendors by revenue
    top_vendors = db.query(
        Vendor.id,
        Vendor.business_name,
        func.sum(Order.total_amount).label('revenue'),
        func.count(Order.id).label('orders')
    ).join(Order, Order.vendor_id == Vendor.id).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).group_by(Vendor.id, Vendor.business_name).order_by(
        func.sum(Order.total_amount).desc()
    ).limit(10).all()
    
    # Top products by sales
    top_products = db.query(
        Product.id,
        Product.name,
        func.sum(Order.total_amount).label('revenue'),
        func.count(Order.id).label('orders')
    ).join(Order, Order.vendor_id == Product.vendor_id).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).group_by(Product.id, Product.name).order_by(
        func.sum(Order.total_amount).desc()
    ).limit(10).all()
    
    # Order status breakdown
    status_breakdown = db.query(
        Order.status,
        func.count(Order.id).label('count'),
        func.sum(Order.total_amount).label('revenue')
    ).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt
    ).group_by(Order.status).all()
    
    # Customer acquisition
    customer_acquisition = db.query(
        func.date(Customer.created_at).label('date'),
        func.count(Customer.id).label('count')
    ).filter(
        Customer.created_at >= start_dt,
        Customer.created_at <= end_dt
    ).group_by(func.date(Customer.created_at)).order_by(func.date(Customer.created_at)).all()
    
    # Sign-ups tracking
    customer_signups = db.query(
        func.date(Customer.created_at).label('date'),
        func.count(Customer.id).label('count')
    ).filter(
        Customer.created_at >= start_dt,
        Customer.created_at <= end_dt
    ).group_by(func.date(Customer.created_at)).order_by(func.date(Customer.created_at)).all()
    
    vendor_signups = db.query(
        func.date(Vendor.created_at).label('date'),
        func.count(Vendor.id).label('count')
    ).filter(
        Vendor.created_at >= start_dt,
        Vendor.created_at <= end_dt
    ).group_by(func.date(Vendor.created_at)).order_by(func.date(Vendor.created_at)).all()
    
    admin_signups = db.query(
        func.date(AdminUser.created_at).label('date'),
        func.count(AdminUser.id).label('count')
    ).filter(
        AdminUser.created_at >= start_dt,
        AdminUser.created_at <= end_dt
    ).group_by(func.date(AdminUser.created_at)).order_by(func.date(AdminUser.created_at)).all()
    
    # Total sign-ups summary
    total_customer_signups = db.query(func.count(Customer.id)).filter(
        Customer.created_at >= start_dt,
        Customer.created_at <= end_dt
    ).scalar() or 0
    
    total_vendor_signups = db.query(func.count(Vendor.id)).filter(
        Vendor.created_at >= start_dt,
        Vendor.created_at <= end_dt
    ).scalar() or 0
    
    total_admin_signups = db.query(func.count(AdminUser.id)).filter(
        AdminUser.created_at >= start_dt,
        AdminUser.created_at <= end_dt
    ).scalar() or 0
    
    # Active users (customers who placed orders, active vendors)
    active_customers = db.query(func.count(func.distinct(Order.customer_id))).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.customer_id.isnot(None)
    ).scalar() or 0
    
    active_vendors = db.query(func.count(func.distinct(Order.vendor_id))).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).scalar() or 0
    
    # Customer retention (repeat customers)
    customer_order_counts = db.query(
        Order.customer_id,
        func.count(Order.id).label('order_count')
    ).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.customer_id.isnot(None),
        Order.status.in_(["delivered", "picked_up"])
    ).group_by(Order.customer_id).all()
    
    repeat_customers = sum(1 for c in customer_order_counts if c.order_count > 1)
    new_customers = sum(1 for c in customer_order_counts if c.order_count == 1)
    
    # Conversion rates (sign-ups to orders)
    customers_with_orders = db.query(func.count(func.distinct(Order.customer_id))).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.customer_id.isnot(None)
    ).scalar() or 0
    
    conversion_rate = (customers_with_orders / total_customer_signups * 100) if total_customer_signups > 0 else 0
    
    # Average order value trends
    avg_order_value_trends = db.query(
        func.date(Order.created_at).label('date'),
        func.avg(Order.total_amount).label('avg_value'),
        func.count(Order.id).label('orders')
    ).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at)).all()
    
    # Vendor performance metrics
    vendor_performance = db.query(
        Vendor.business_name,
        func.count(Order.id).label('orders'),
        func.sum(Order.total_amount).label('revenue'),
        func.avg(Order.total_amount).label('avg_order_value')
    ).join(Order, Order.vendor_id == Vendor.id).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).group_by(Vendor.id, Vendor.business_name).order_by(
        func.sum(Order.total_amount).desc()
    ).limit(5).all()
    
    # Driver signups
    driver_signups = db.query(
        func.date(Driver.created_at).label('date'),
        func.count(Driver.id).label('count')
    ).filter(
        Driver.created_at >= start_dt,
        Driver.created_at <= end_dt
    ).group_by(func.date(Driver.created_at)).order_by(func.date(Driver.created_at)).all()
    
    total_driver_signups = db.query(func.count(Driver.id)).filter(
        Driver.created_at >= start_dt,
        Driver.created_at <= end_dt
    ).scalar() or 0
    
    # Driver statistics
    total_drivers = db.query(func.count(Driver.id)).scalar() or 0
    active_drivers = db.query(func.count(Driver.id)).filter(Driver.is_active == True).scalar() or 0
    available_drivers = db.query(func.count(Driver.id)).filter(
        Driver.is_active == True,
        Driver.is_available == True
    ).scalar() or 0
    pending_verification = db.query(func.count(Driver.id)).filter(
        Driver.verification_status == "pending"
    ).scalar() or 0
    
    # Delivery statistics
    total_deliveries = db.query(func.count(Delivery.id)).filter(
        Delivery.created_at >= start_dt,
        Delivery.created_at <= end_dt
    ).scalar() or 0
    
    completed_deliveries = db.query(func.count(Delivery.id)).filter(
        Delivery.created_at >= start_dt,
        Delivery.created_at <= end_dt,
        Delivery.status == "delivered"
    ).scalar() or 0
    
    cancelled_deliveries = db.query(func.count(Delivery.id)).filter(
        Delivery.created_at >= start_dt,
        Delivery.created_at <= end_dt,
        Delivery.status == "cancelled"
    ).scalar() or 0
    
    # Delivery trends
    delivery_trends = db.query(
        func.date(Delivery.created_at).label('date'),
        func.count(Delivery.id).label('count'),
        func.sum(Delivery.driver_earnings).label('total_earnings')
    ).filter(
        Delivery.created_at >= start_dt,
        Delivery.created_at <= end_dt
    ).group_by(func.date(Delivery.created_at)).order_by(func.date(Delivery.created_at)).all()
    
    # Top drivers by deliveries
    top_drivers = db.query(
        Driver.id,
        Driver.first_name,
        Driver.last_name,
        func.count(Delivery.id).label('deliveries'),
        func.sum(Delivery.driver_earnings).label('earnings'),
        func.avg(Delivery.driver_earnings).label('avg_earnings')
    ).join(Delivery, Delivery.driver_id == Driver.id).filter(
        Delivery.created_at >= start_dt,
        Delivery.created_at <= end_dt
    ).group_by(Driver.id, Driver.first_name, Driver.last_name).order_by(
        func.count(Delivery.id).desc()
    ).limit(5).all()
    
    # Total driver earnings
    total_driver_earnings = db.query(func.sum(Delivery.driver_earnings)).filter(
        Delivery.created_at >= start_dt,
        Delivery.created_at <= end_dt
    ).scalar() or 0
    
    return {
        "revenue_trends": [
            {
                "date": str(trend.date),
                "revenue": float(trend.revenue) if trend.revenue else 0,
                "orders": trend.orders
            }
            for trend in revenue_trends
        ],
        "top_vendors": [
            {
                "id": str(vendor.id),
                "name": vendor.business_name,
                "revenue": float(vendor.revenue) if vendor.revenue else 0,
                "orders": vendor.orders
            }
            for vendor in top_vendors
        ],
        "top_products": [
            {
                "id": str(product.id),
                "name": product.name,
                "revenue": float(product.revenue) if product.revenue else 0,
                "orders": product.orders
            }
            for product in top_products
        ],
        "status_breakdown": {
            status: {
                "count": count,
                "revenue": float(revenue) if revenue else 0
            }
            for status, count, revenue in status_breakdown
        },
        "customer_acquisition": [
            {
                "date": str(acq.date),
                "count": acq.count
            }
            for acq in customer_acquisition
        ],
        "vendor_performance": [
            {
                "name": vp.business_name,
                "orders": vp.orders,
                "revenue": float(vp.revenue) if vp.revenue else 0,
                "avg_order_value": float(vp.avg_order_value) if vp.avg_order_value else 0
            }
            for vp in vendor_performance
        ],
        "signups": {
            "customer_signups": [
                {
                    "date": str(signup.date),
                    "count": signup.count
                }
                for signup in customer_signups
            ],
            "vendor_signups": [
                {
                    "date": str(signup.date),
                    "count": signup.count
                }
                for signup in vendor_signups
            ],
            "admin_signups": [
                {
                    "date": str(signup.date),
                    "count": signup.count
                }
                for signup in admin_signups
            ],
            "driver_signups": [
                {
                    "date": str(signup.date),
                    "count": signup.count
                }
                for signup in driver_signups
            ],
            "total_customer_signups": total_customer_signups,
            "total_vendor_signups": total_vendor_signups,
            "total_admin_signups": total_admin_signups,
            "total_driver_signups": total_driver_signups
        },
        "user_metrics": {
            "active_customers": active_customers,
            "active_vendors": active_vendors,
            "repeat_customers": repeat_customers,
            "new_customers": new_customers,
            "customer_retention_rate": (repeat_customers / active_customers * 100) if active_customers > 0 else 0,
            "conversion_rate": conversion_rate
        },
        "avg_order_value_trends": [
            {
                "date": str(trend.date),
                "avg_value": float(trend.avg_value) if trend.avg_value else 0,
                "orders": trend.orders
            }
            for trend in avg_order_value_trends
        ],
        "driver_metrics": {
            "total_drivers": total_drivers,
            "active_drivers": active_drivers,
            "available_drivers": available_drivers,
            "pending_verification": pending_verification,
            "total_driver_signups": total_driver_signups
        },
        "delivery_metrics": {
            "total_deliveries": total_deliveries,
            "completed_deliveries": completed_deliveries,
            "cancelled_deliveries": cancelled_deliveries,
            "completion_rate": (completed_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0,
            "total_driver_earnings": float(total_driver_earnings) if total_driver_earnings else 0.0
        },
        "delivery_trends": [
            {
                "date": str(trend.date),
                "count": trend.count,
                "total_earnings": float(trend.total_earnings) if trend.total_earnings else 0
            }
            for trend in delivery_trends
        ],
        "top_drivers": [
            {
                "id": str(driver.id),
                "name": f"{driver.first_name} {driver.last_name}",
                "deliveries": driver.deliveries,
                "earnings": float(driver.earnings) if driver.earnings else 0,
                "avg_earnings": float(driver.avg_earnings) if driver.avg_earnings else 0
            }
            for driver in top_drivers
        ]
    }


@router.get("/revenue")
async def get_revenue_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    group_by: str = Query("day", regex="^(day|week|month)$"),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get revenue analytics with date range"""
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
    if not end_date:
        end_date = datetime.utcnow().isoformat()
    
    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    if group_by == "day":
        results = db.query(
            func.date(Order.created_at).label('period'),
            func.sum(Order.total_amount).label('revenue'),
            func.count(Order.id).label('orders')
        ).filter(
            Order.created_at >= start_dt,
            Order.created_at <= end_dt,
            Order.status.in_(["delivered", "picked_up"])
        ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at)).all()
    elif group_by == "week":
        results = db.query(
            extract('year', Order.created_at).label('year'),
            extract('week', Order.created_at).label('week'),
            func.sum(Order.total_amount).label('revenue'),
            func.count(Order.id).label('orders')
        ).filter(
            Order.created_at >= start_dt,
            Order.created_at <= end_dt,
            Order.status.in_(["delivered", "picked_up"])
        ).group_by(
            extract('year', Order.created_at),
            extract('week', Order.created_at)
        ).order_by(
            extract('year', Order.created_at),
            extract('week', Order.created_at)
        ).all()
        
        results = [
            type('obj', (object,), {
                'period': f"Week {int(r.week)}, {int(r.year)}",
                'revenue': r.revenue,
                'orders': r.orders
            })() for r in results
        ]
    elif group_by == "month":
        results = db.query(
            extract('year', Order.created_at).label('year'),
            extract('month', Order.created_at).label('month'),
            func.sum(Order.total_amount).label('revenue'),
            func.count(Order.id).label('orders')
        ).filter(
            Order.created_at >= start_dt,
            Order.created_at <= end_dt,
            Order.status.in_(["delivered", "picked_up"])
        ).group_by(
            extract('year', Order.created_at),
            extract('month', Order.created_at)
        ).order_by(
            extract('year', Order.created_at),
            extract('month', Order.created_at)
        ).all()
        
        results = [
            type('obj', (object,), {
                'period': f"{int(r.month)}/{int(r.year)}",
                'revenue': r.revenue,
                'orders': r.orders
            })() for r in results
        ]
    else:
        results = []
    
    return {
        "periods": [
            {
                "period": str(r.period),
                "revenue": float(r.revenue) if r.revenue else 0,
                "orders": r.orders
            }
            for r in results
        ]
    }


@router.get("/comparison")
async def get_period_comparison(
    period1_start: str = Query(...),
    period1_end: str = Query(...),
    period2_start: str = Query(...),
    period2_end: str = Query(...),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Compare two time periods"""
    try:
        # Handle both date-only strings (YYYY-MM-DD) and ISO datetime strings
        def parse_date(date_str):
            try:
                # Try parsing as date-only first (YYYY-MM-DD)
                if len(date_str) == 10 and date_str.count('-') == 2:
                    return datetime.strptime(date_str, '%Y-%m-%d')
                # Otherwise try ISO format
                if 'T' in date_str or '+' in date_str or 'Z' in date_str:
                    return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                # Fallback: try parsing as date
                return datetime.strptime(date_str.split('T')[0], '%Y-%m-%d')
            except Exception as e:
                raise ValueError(f"Invalid date format: {date_str}, error: {str(e)}")
        
        p1_start = parse_date(period1_start)
        p1_end = parse_date(period1_end)
        p2_start = parse_date(period2_start)
        p2_end = parse_date(period2_end)
        
        # Set end dates to end of day
        p1_end = p1_end.replace(hour=23, minute=59, second=59, microsecond=999999)
        p2_end = p2_end.replace(hour=23, minute=59, second=59, microsecond=999999)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    
    def get_period_stats(start, end):
        orders = db.query(Order).filter(
            Order.created_at >= start,
            Order.created_at <= end,
            Order.status.in_(["delivered", "picked_up"])
        ).all()
        
        vendors_count = db.query(func.count(func.distinct(Order.vendor_id))).filter(
            Order.created_at >= start,
            Order.created_at <= end,
            Order.status.in_(["delivered", "picked_up"])
        ).scalar() or 0
        
        customers_count = db.query(func.count(func.distinct(Order.customer_id))).filter(
            Order.created_at >= start,
            Order.created_at <= end,
            Order.status.in_(["delivered", "picked_up"])
        ).scalar() or 0
        
        return {
            "total_orders": len(orders),
            "total_revenue": float(sum(order.total_amount for order in orders)),
            "avg_order_value": float(sum(order.total_amount for order in orders) / len(orders)) if orders else 0,
            "vendors_count": vendors_count,
            "customers_count": customers_count
        }
    
    period1 = get_period_stats(p1_start, p1_end)
    period2 = get_period_stats(p2_start, p2_end)
    
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
            "avg_order_value": calc_change(period1["avg_order_value"], period2["avg_order_value"]),
            "vendors": calc_change(period1["vendors_count"], period2["vendors_count"]),
            "customers": calc_change(period1["customers_count"], period2["customers_count"])
        }
    }


@router.get("/reports/sales")
async def get_sales_report(
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Generate detailed sales report"""
    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    # Overall stats
    total_orders = db.query(func.count(Order.id)).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).scalar() or 0
    
    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).scalar() or 0
    
    # By vendor
    by_vendor = db.query(
        Vendor.business_name,
        func.count(Order.id).label('orders'),
        func.sum(Order.total_amount).label('revenue')
    ).join(Order, Order.vendor_id == Vendor.id).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).group_by(Vendor.id, Vendor.business_name).all()
    
    # By day
    by_day = db.query(
        func.date(Order.created_at).label('date'),
        func.count(Order.id).label('orders'),
        func.sum(Order.total_amount).label('revenue')
    ).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at)).all()
    
    return {
        "summary": {
            "total_orders": total_orders,
            "total_revenue": float(total_revenue) if total_revenue else 0,
            "avg_order_value": float(total_revenue / total_orders) if total_orders > 0 else 0
        },
        "by_vendor": [
            {
                "vendor": v.business_name,
                "orders": v.orders,
                "revenue": float(v.revenue) if v.revenue else 0
            }
            for v in by_vendor
        ],
        "by_day": [
            {
                "date": str(d.date),
                "orders": d.orders,
                "revenue": float(d.revenue) if d.revenue else 0
            }
            for d in by_day
        ]
    }
