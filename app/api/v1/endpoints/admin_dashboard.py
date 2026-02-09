"""
Admin dashboard endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.core.database import get_db
# Import Vendor first to ensure relationship resolution works
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get platform-wide statistics"""
    try:
        # Ensure all models are imported in correct order to avoid relationship issues
        from app.models.vendor import Vendor
        from app.models.customer import Customer
        from app.models.product import Product
        # Import Order after Vendor to ensure relationship resolution
        from app.models.order import Order
        
        # Total counts - wrap in try-except to handle any schema issues
        try:
            total_vendors = db.query(func.count(Vendor.id)).scalar() or 0
            active_vendors = db.query(func.count(Vendor.id)).filter(Vendor.status == "active").scalar() or 0
            total_customers = db.query(func.count(Customer.id)).scalar() or 0
            total_products = db.query(func.count(Product.id)).scalar() or 0
        except Exception as e:
            print(f"Error getting basic counts: {e}")
            total_vendors = 0
            active_vendors = 0
            total_customers = 0
            total_products = 0
        
        # Order counts and revenue - wrap in try-except
        try:
            total_orders = db.query(func.count(Order.id)).scalar() or 0
            total_revenue = db.query(func.sum(Order.total_amount)).filter(
                Order.status.in_(["delivered", "picked_up"])
            ).scalar() or 0
        except Exception as e:
            print(f"Error getting order stats: {e}")
            total_orders = 0
            total_revenue = 0
        
        # Today's stats - wrap in try-except
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = datetime.utcnow()
            today_orders = db.query(func.count(Order.id)).filter(
                Order.created_at >= today_start,
                Order.created_at <= today_end
            ).scalar() or 0
            
            today_revenue = db.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= today_start,
                Order.created_at <= today_end,
                Order.status.in_(["delivered", "picked_up"])
            ).scalar() or 0
        except Exception as e:
            print(f"Error getting today's stats: {e}")
            today_orders = 0
            today_revenue = 0
        
        # This month's stats - wrap in try-except
        try:
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_orders = db.query(func.count(Order.id)).filter(
                Order.created_at >= month_start
            ).scalar() or 0
            
            month_revenue = db.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= month_start,
                Order.status.in_(["delivered", "picked_up"])
            ).scalar() or 0
        except Exception as e:
            print(f"Error getting month stats: {e}")
            month_orders = 0
            month_revenue = 0
        
        # Order status breakdown - wrap in try-except
        try:
            order_statuses = db.query(
                Order.status,
                func.count(Order.id).label("count")
            ).group_by(Order.status).all()
            
            status_breakdown = {status: count for status, count in order_statuses}
        except Exception as e:
            print(f"Error getting order status breakdown: {e}")
            status_breakdown = {}
        
        return {
            "overview": {
                "total_vendors": total_vendors,
                "active_vendors": active_vendors,
                "total_customers": total_customers,
                "total_products": total_products,
                "total_orders": total_orders,
                "total_revenue": float(total_revenue)
            },
            "today": {
                "orders": today_orders,
                "revenue": float(today_revenue)
            },
            "this_month": {
                "orders": month_orders,
                "revenue": float(month_revenue)
            },
            "order_status_breakdown": status_breakdown
        }
    except Exception as e:
        import traceback
        error_msg = f"Error in dashboard stats: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = 20,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get recent platform activity"""
    from app.models.admin import AdminActivityLog
    
    activities = db.query(AdminActivityLog).order_by(
        AdminActivityLog.created_at.desc()
    ).limit(limit).all()
    
    return [
        {
            "id": str(activity.id),
            "action": activity.action,
            "entity_type": activity.entity_type,
            "entity_id": str(activity.entity_id) if activity.entity_id else None,
            "details": activity.details,
            "created_at": activity.created_at,
            "admin_name": f"{activity.admin.first_name} {activity.admin.last_name}" if activity.admin else None
        }
        for activity in activities
    ]

