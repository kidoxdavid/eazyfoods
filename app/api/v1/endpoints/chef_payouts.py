"""
Chef payout endpoints - balance, history, stats
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from uuid import UUID
from decimal import Decimal
from io import StringIO
import csv
from app.core.database import get_db
from app.models.order import Order
from app.models.chef_payout import ChefPayout, ChefPayoutItem
from app.api.v1.dependencies import get_current_chef

router = APIRouter()


def _payout_to_dict(p):
    return {
        "id": str(p.id),
        "payout_number": p.payout_number,
        "net_amount": float(p.net_amount) if p.net_amount else 0,
        "status": p.status,
        "period_start": p.period_start.isoformat() if p.period_start else None,
        "period_end": p.period_end.isoformat() if p.period_end else None,
        "payout_method": p.payout_method,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "completed_at": p.completed_at.isoformat() if p.completed_at else None,
    }


@router.get("/balance", response_model=dict)
async def get_chef_balance(
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Available balance: delivered orders not yet included in a payout."""
    chef_id = UUID(current_chef["chef_id"])
    paid_out_ids = db.query(ChefPayoutItem.order_id).subquery()
    pending_orders = db.query(Order).filter(
        Order.chef_id == chef_id,
        Order.status.in_(["picked_up", "delivered"]),
        Order.payment_status == "paid",
        ~Order.id.in_(paid_out_ids),
    ).all()
    available_balance = sum(o.net_payout for o in pending_orders)
    return {
        "available_balance": float(available_balance),
        "pending_orders_count": len(pending_orders),
        "currency": "USD",
    }


@router.get("/stats", response_model=dict)
async def get_chef_payout_stats(
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Payout statistics: total paid, pending payouts count/amount."""
    chef_id = UUID(current_chef["chef_id"])
    total_payouts = db.query(func.count(ChefPayout.id)).filter(
        ChefPayout.chef_id == chef_id
    ).scalar() or 0
    total_paid = db.query(func.coalesce(func.sum(ChefPayout.net_amount), 0)).filter(
        ChefPayout.chef_id == chef_id,
        ChefPayout.status == "completed",
    ).scalar() or Decimal(0)
    pending_payouts = db.query(func.count(ChefPayout.id)).filter(
        ChefPayout.chef_id == chef_id,
        ChefPayout.status.in_(["pending", "processing"]),
    ).scalar() or 0
    pending_amount = db.query(func.coalesce(func.sum(ChefPayout.net_amount), 0)).filter(
        ChefPayout.chef_id == chef_id,
        ChefPayout.status.in_(["pending", "processing"]),
    ).scalar() or Decimal(0)
    return {
        "total_payouts": total_payouts,
        "total_paid": float(total_paid),
        "pending_payouts": pending_payouts,
        "pending_amount": float(pending_amount),
        "currency": "USD",
    }


@router.get("/", response_model=List[dict])
async def get_chef_payouts(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """List payout history for current chef."""
    chef_id = UUID(current_chef["chef_id"])
    query = db.query(ChefPayout).filter(ChefPayout.chef_id == chef_id)
    if status_filter:
        query = query.filter(ChefPayout.status == status_filter)
    payouts = query.order_by(ChefPayout.created_at.desc()).offset(skip).limit(limit).all()
    return [_payout_to_dict(p) for p in payouts]


@router.get("/{payout_id}", response_model=dict)
async def get_chef_payout(
    payout_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get a single payout with line items."""
    chef_id = UUID(current_chef["chef_id"])
    payout = db.query(ChefPayout).filter(
        ChefPayout.id == UUID(payout_id),
        ChefPayout.chef_id == chef_id,
    ).first()
    if not payout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payout not found")
    out = _payout_to_dict(payout)
    out["items"] = [
        {
            "id": str(i.id),
            "order_id": str(i.order_id),
            "order_number": i.order_number,
            "net_payout": float(i.net_payout) if i.net_payout else 0,
        }
        for i in payout.items
    ]
    return out


@router.get("/statement/csv")
async def get_chef_payout_statement(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Download earnings/payout statement as CSV."""
    chef_id = UUID(current_chef["chef_id"])
    query = db.query(ChefPayout).filter(ChefPayout.chef_id == chef_id)
    if start_date:
        query = query.filter(ChefPayout.period_start >= start_date)
    if end_date:
        query = query.filter(ChefPayout.period_end <= end_date)
    payouts = query.order_by(ChefPayout.period_start.desc()).all()

    out = StringIO()
    w = csv.writer(out)
    w.writerow(["payout_number", "period_start", "period_end", "net_amount", "status", "created_at"])
    for p in payouts:
        w.writerow([
            p.payout_number,
            p.period_start.isoformat() if p.period_start else "",
            p.period_end.isoformat() if p.period_end else "",
            float(p.net_amount) if p.net_amount else 0,
            p.status or "",
            p.created_at.isoformat() if p.created_at else "",
        ])
    out.seek(0)
    return StreamingResponse(
        iter([out.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=chef-earnings-statement.csv"}
    )
