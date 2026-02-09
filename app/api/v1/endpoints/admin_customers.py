"""
Admin customer management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
# Import Vendor first to ensure relationship resolution
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.order import Order
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_customers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all customers"""
    query = db.query(Customer)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Customer.email.ilike(search_term),
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.phone.ilike(search_term)
            )
        )
    
    try:
        customers = query.order_by(Customer.created_at.desc()).offset(skip).limit(limit).all()
        
        # Get stats for each customer
        result = []
        for customer in customers:
            try:
                order_count = db.query(func.count(Order.id)).filter(Order.customer_id == customer.id).scalar() or 0
                total_spent = db.query(func.sum(Order.total_amount)).filter(
                    Order.customer_id == customer.id,
                    Order.status.in_(["delivered", "picked_up"])
                ).scalar() or 0
                
                result.append({
                    "id": str(customer.id),
                    "email": customer.email,
                    "first_name": customer.first_name,
                    "last_name": customer.last_name,
                    "phone": customer.phone,
                    "is_email_verified": customer.is_email_verified,
                    "order_count": order_count,
                    "total_spent": float(total_spent) if total_spent else 0,
                    "created_at": customer.created_at
                })
            except Exception as e:
                import traceback
                print(f"Error processing customer {customer.id}: {e}")
                traceback.print_exc()
                continue
        
        return result
    except Exception as e:
        import traceback
        error_msg = f"Error in get_all_customers: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.get("/{customer_id}", response_model=dict)
async def get_customer_detail(
    customer_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed customer information"""
    # Validate UUID format
    try:
        customer_uuid = UUID(customer_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid customer ID format: {str(e)}"
        )
    
    customer = db.query(Customer).filter(Customer.id == customer_uuid).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Get comprehensive stats
    try:
        order_count = db.query(func.count(Order.id)).filter(Order.customer_id == customer.id).scalar() or 0
        total_spent = db.query(func.sum(Order.total_amount)).filter(
            Order.customer_id == customer.id,
            Order.status.in_(["delivered", "picked_up"])
        ).scalar() or 0
        
        # Get recent orders
        recent_orders = db.query(Order).filter(
            Order.customer_id == customer.id
        ).order_by(Order.created_at.desc()).limit(10).all()
        
        # Get customer addresses
        from app.models.customer import CustomerAddress
        addresses = db.query(CustomerAddress).filter(
            CustomerAddress.customer_id == customer.id
        ).all()
    except Exception as e:
        # Log error but continue with basic customer info
        print(f"Error fetching customer stats: {str(e)}")
        order_count = 0
        total_spent = 0
        recent_orders = []
        addresses = []
    
    return {
        "id": str(customer.id),
        "email": customer.email,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "phone": customer.phone,
        "is_email_verified": customer.is_email_verified,
        "order_count": order_count,
        "total_spent": float(total_spent) if total_spent else 0,
        "created_at": customer.created_at,
        "addresses": [
            {
                "id": str(addr.id),
                "type": addr.type,
                "street_address": addr.street_address,
                "city": addr.city,
                "state": addr.state,
                "postal_code": addr.postal_code,
                "country": addr.country,
                "is_default": addr.is_default
            }
            for addr in addresses
        ],
        "recent_orders": [
            {
                "id": str(order.id),
                "order_number": order.order_number,
                "status": order.status,
                "total_amount": float(order.total_amount),
                "created_at": order.created_at
            }
            for order in recent_orders
        ]
    }


@router.put("/{customer_id}/suspend")
async def suspend_customer(
    customer_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Suspend a customer account"""
    customer = db.query(Customer).filter(Customer.id == UUID(customer_id)).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Note: We might need to add an is_suspended field to Customer model
    # For now, we'll just log the action
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="customer_suspended",
        entity_type="customer",
        entity_id=customer.id,
        details={"email": customer.email}
    )
    db.add(log)
    db.commit()
    
    return {"message": "Customer suspended successfully"}


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a customer account"""
    customer = db.query(Customer).filter(Customer.id == UUID(customer_id)).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Log the action before deletion
    from app.models.admin import AdminActivityLog
    log = AdminActivityLog(
        admin_id=UUID(current_admin["admin_id"]),
        action="customer_deleted",
        entity_type="customer",
        entity_id=customer.id,
        details={"email": customer.email}
    )
    db.add(log)
    
    db.delete(customer)
    db.commit()
    
    return {"message": "Customer deleted successfully"}

