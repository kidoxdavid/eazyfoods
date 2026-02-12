"""
Admin authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
import bcrypt
from app.core.database import get_db
from app.core.config import settings
from app.models.admin import AdminUser
from app.schemas.admin import AdminLogin, TokenResponse, AdminUserResponse, AdminUserCreate, AdminUserCreate

router = APIRouter()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        password_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


@router.post("/login", response_model=TokenResponse)
async def admin_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Admin login endpoint"""
    admin = db.query(AdminUser).filter(AdminUser.email == form_data.username).first()
    
    if not admin or not verify_password(form_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive"
        )
    
    # Update last login
    admin.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={
            "sub": admin.email,
            "admin_id": str(admin.id),
            "role": admin.role
        },
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        admin=AdminUserResponse(
            id=str(admin.id),
            email=admin.email,
            first_name=admin.first_name,
            last_name=admin.last_name,
            role=admin.role,
            permissions=admin.permissions,
            is_active=admin.is_active,
            last_login=admin.last_login,
            created_at=admin.created_at
        )
    )


@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def admin_signup(
    user_data: AdminUserCreate,
    db: Session = Depends(get_db)
):
    """Create admin/marketing user. Disabled by default; set ADMIN_SIGNUP_ENABLED=true to allow (e.g. first admin)."""
    if not getattr(settings, "ADMIN_SIGNUP_ENABLED", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Signup is disabled. Contact an administrator for access.",
        )
    # Check if email already exists
    existing = db.query(AdminUser).filter(AdminUser.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create admin user
    admin = AdminUser(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role or "marketing",  # Default to marketing role for signups
        is_active=True,
        permissions=user_data.permissions or {}
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return {
        "message": "Account created successfully. You can now login.",
        "id": str(admin.id),
        "email": admin.email
    }


@router.post("/login-json", response_model=TokenResponse)
async def admin_login_json(
    login_data: AdminLogin,
    db: Session = Depends(get_db)
):
    """Admin login endpoint (JSON format)"""
    admin = db.query(AdminUser).filter(AdminUser.email == login_data.email).first()
    
    if not admin or not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive"
        )
    
    # Update last login
    admin.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={
            "sub": admin.email,
            "admin_id": str(admin.id),
            "role": admin.role
        },
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        admin=AdminUserResponse(
            id=str(admin.id),
            email=admin.email,
            first_name=admin.first_name,
            last_name=admin.last_name,
            role=admin.role,
            permissions=admin.permissions,
            is_active=admin.is_active,
            last_login=admin.last_login,
            created_at=admin.created_at
        )
    )

