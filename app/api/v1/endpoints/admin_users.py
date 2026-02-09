"""
Admin user management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.models.admin import AdminUser
from app.api.v1.dependencies import get_current_admin
import bcrypt

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_admin_users(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all admin users"""
    admins = db.query(AdminUser).all()
    
    return [
        {
            "id": str(admin.id),
            "email": admin.email,
            "first_name": admin.first_name,
            "last_name": admin.last_name,
            "role": admin.role,
            "is_active": admin.is_active,
            "permissions": admin.permissions,
            "created_at": admin.created_at,
            "last_login": admin.last_login
        }
        for admin in admins
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    user_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new admin user"""
    # Check if email already exists
    existing = db.query(AdminUser).filter(AdminUser.email == user_data.get("email")).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Hash password
    password = user_data.get("password")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")
    
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    
    admin = AdminUser(
        email=user_data.get("email"),
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        password_hash=hashed_password,
        role=user_data.get("role", "admin"),
        is_active=user_data.get("is_active", True),
        permissions=user_data.get("permissions", {})
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return {
        "id": str(admin.id),
        "email": admin.email,
        "message": "Admin user created successfully"
    }


@router.put("/{admin_id}")
async def update_admin_user(
    admin_id: str,
    user_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update admin user"""
    admin = db.query(AdminUser).filter(AdminUser.id == UUID(admin_id)).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Update fields
    if "first_name" in user_data:
        admin.first_name = user_data["first_name"]
    if "last_name" in user_data:
        admin.last_name = user_data["last_name"]
    if "role" in user_data:
        admin.role = user_data["role"]
    if "is_active" in user_data:
        admin.is_active = user_data["is_active"]
    if "permissions" in user_data:
        admin.permissions = user_data["permissions"]
    if "password" in user_data and user_data["password"]:
        # Hash new password
        password_bytes = user_data["password"].encode('utf-8')
        salt = bcrypt.gensalt()
        admin.password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    
    db.commit()
    
    return {"message": "Admin user updated successfully"}


@router.put("/{admin_id}/toggle-active")
async def toggle_admin_active(
    admin_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle admin user active status"""
    admin = db.query(AdminUser).filter(AdminUser.id == UUID(admin_id)).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Prevent deactivating yourself
    if str(admin.id) == current_admin["admin_id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    admin.is_active = not admin.is_active
    db.commit()
    
    return {"message": f"Admin user {'activated' if admin.is_active else 'deactivated'} successfully"}


@router.delete("/{admin_id}")
async def delete_admin_user(
    admin_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete admin user"""
    admin = db.query(AdminUser).filter(AdminUser.id == UUID(admin_id)).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Prevent deleting yourself
    if str(admin.id) == current_admin["admin_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(admin)
    db.commit()
    
    return {"message": "Admin user deleted successfully"}

