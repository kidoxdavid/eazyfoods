"""
Payout management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List
from datetime import date, datetime
from uuid import UUID
from app.core.database import get_db
from app.models.payout import Payout, PayoutItem
from app.models.order import Order
from app.models.vendor import Vendor
from app.schemas.payout import PayoutResponse, PayoutListResponse
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.get("/", response_model=List[PayoutListResponse])
async def get_payouts(
    skip: int = 0,
    limit: int = 50,
    status_filter: str = None,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get all payouts for current vendor"""
    query = db.query(Payout).filter(Payout.vendor_id == current_vendor["vendor_id"])
    
    if status_filter:
        query = query.filter(Payout.status == status_filter)
    
    payouts = query.order_by(Payout.created_at.desc()).offset(skip).limit(limit).all()
    return payouts


@router.get("/{payout_id}", response_model=PayoutResponse)
async def get_payout(
    payout_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get a specific payout with items"""
    payout = db.query(Payout).filter(
        Payout.id == payout_id,
        Payout.vendor_id == current_vendor["vendor_id"]
    ).first()
    
    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payout not found"
        )
    
    return payout


@router.get("/balance/available", response_model=dict)
async def get_available_balance(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get available balance (orders not yet in a payout)"""
    # Get all completed orders that haven't been included in a payout
    completed_orders = db.query(Order).filter(
        Order.vendor_id == current_vendor["vendor_id"],
        Order.status.in_(["picked_up", "delivered"]),
        Order.payment_status == "paid"
    ).all()
    
    # Get order IDs already in payouts
    paid_out_order_ids = db.query(PayoutItem.order_id).subquery()
    
    pending_orders = db.query(Order).filter(
        Order.vendor_id == current_vendor["vendor_id"],
        Order.status.in_(["picked_up", "delivered"]),
        Order.payment_status == "paid",
        ~Order.id.in_(paid_out_order_ids)
    ).all()
    
    available_balance = sum(order.net_payout for order in pending_orders)
    pending_count = len(pending_orders)
    
    return {
        "available_balance": float(available_balance),
        "pending_orders_count": pending_count,
        "currency": "USD"
    }


@router.get("/summary/stats", response_model=dict)
async def get_payout_stats(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get payout statistics"""
    vendor_id = current_vendor["vendor_id"]
    
    # Total payouts
    total_payouts = db.query(func.count(Payout.id)).filter(
        Payout.vendor_id == vendor_id
    ).scalar() or 0
    
    # Total paid out
    total_paid = db.query(func.sum(Payout.net_amount)).filter(
        Payout.vendor_id == vendor_id,
        Payout.status == "completed"
    ).scalar() or 0
    
    # Pending payouts
    pending_payouts = db.query(func.count(Payout.id)).filter(
        Payout.vendor_id == vendor_id,
        Payout.status.in_(["pending", "processing"])
    ).scalar() or 0
    
    # Pending amount
    pending_amount = db.query(func.sum(Payout.net_amount)).filter(
        Payout.vendor_id == vendor_id,
        Payout.status.in_(["pending", "processing"])
    ).scalar() or 0
    
    # Total commission (platform share) across all payouts for this vendor
    total_commission = db.query(func.sum(Payout.commission_amount)).filter(
        Payout.vendor_id == vendor_id
    ).scalar() or 0
    
    # Vendor's commission rate (as set in Admin → Settings → Commission / per-vendor)
    vendor = db.query(Vendor).filter(Vendor.id == UUID(vendor_id)).first()
    commission_rate = float(vendor.commission_rate) if vendor and vendor.commission_rate is not None else None
    
    return {
        "total_payouts": total_payouts,
        "total_paid": float(total_paid),
        "pending_payouts": pending_payouts,
        "pending_amount": float(pending_amount),
        "total_commission": float(total_commission),
        "commission_rate": commission_rate,
        "currency": "USD"
    }

