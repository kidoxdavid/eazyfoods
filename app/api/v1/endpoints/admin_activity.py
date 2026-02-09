"""
Admin activity log endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.models.admin import AdminActivityLog, AdminUser
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_activity_logs(
    skip: int = 0,
    limit: int = 100,
    action_filter: Optional[str] = None,
    entity_type_filter: Optional[str] = None,
    admin_id: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get admin activity logs"""
    query = db.query(AdminActivityLog)
    
    if action_filter:
        query = query.filter(AdminActivityLog.action.ilike(f"%{action_filter}%"))
    
    if entity_type_filter:
        query = query.filter(AdminActivityLog.entity_type == entity_type_filter)
    
    if admin_id:
        query = query.filter(AdminActivityLog.admin_id == UUID(admin_id))
    
    logs = query.order_by(AdminActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for log in logs:
        admin = db.query(AdminUser).filter(AdminUser.id == log.admin_id).first()
        
        result.append({
            "id": str(log.id),
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id) if log.entity_id else None,
            "details": log.details,
            "admin_id": str(log.admin_id),
            "admin_name": f"{admin.first_name} {admin.last_name}" if admin else "Unknown",
            "admin_email": admin.email if admin else None,
            "created_at": log.created_at
        })
    
    return result


@router.get("/stats")
async def get_activity_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get activity statistics"""
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    total_actions = db.query(func.count(AdminActivityLog.id)).scalar() or 0
    
    # Actions in last 24 hours
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_actions = db.query(func.count(AdminActivityLog.id)).filter(
        AdminActivityLog.created_at >= yesterday
    ).scalar() or 0
    
    # Most active admins
    top_admins = db.query(
        AdminUser.first_name,
        AdminUser.last_name,
        AdminUser.email,
        func.count(AdminActivityLog.id).label('action_count')
    ).join(
        AdminActivityLog, AdminActivityLog.admin_id == AdminUser.id
    ).group_by(
        AdminUser.id, AdminUser.first_name, AdminUser.last_name, AdminUser.email
    ).order_by(
        func.count(AdminActivityLog.id).desc()
    ).limit(10).all()
    
    # Action types breakdown
    action_breakdown = db.query(
        AdminActivityLog.action,
        func.count(AdminActivityLog.id).label('count')
    ).group_by(AdminActivityLog.action).order_by(
        func.count(AdminActivityLog.id).desc()
    ).limit(10).all()
    
    return {
        "total_actions": total_actions,
        "recent_actions_24h": recent_actions,
        "top_admins": [
            {
                "name": f"{admin.first_name} {admin.last_name}",
                "email": admin.email,
                "action_count": admin.action_count
            }
            for admin in top_admins
        ],
        "action_breakdown": {
            action: count for action, count in action_breakdown
        }
    }

