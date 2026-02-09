"""
FastAPI dependencies for authentication and authorization
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import get_db
from app.models.vendor import VendorUser
from app.models.customer import Customer
from app.models.admin import AdminUser
from app.models.driver import Driver
from app.models.chef import Chef
from uuid import UUID

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
customer_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/customer/auth/login", auto_error=False)
driver_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/driver/auth/login", auto_error=False)
chef_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/chef/auth/login", auto_error=False)
admin_oauth2_scheme = HTTPBearer(auto_error=False)


async def get_current_vendor(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> dict:
    """
    Get current authenticated vendor user from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        vendor_id: str = payload.get("vendor_id")
        user_id: str = payload.get("user_id")
        role: str = payload.get("role")
        
        if email is None or vendor_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Verify vendor user exists
    vendor_user = db.query(VendorUser).filter(VendorUser.id == UUID(user_id)).first()
    if vendor_user is None:
        raise credentials_exception
    
    return {
        "email": email,
        "vendor_id": vendor_id,
        "user_id": user_id,
        "role": role
    }


async def get_current_customer(token: str = Depends(customer_oauth2_scheme), db: Session = Depends(get_db)) -> dict:
    """
    Get current authenticated customer from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if token is None:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        customer_id: str = payload.get("customer_id")
        
        if email is None or customer_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == UUID(customer_id)).first()
    if customer is None:
        raise credentials_exception
    
    return {
        "email": email,
        "customer_id": customer_id
    }


async def get_optional_customer(token: str = Depends(customer_oauth2_scheme), db: Session = Depends(get_db)) -> Optional[dict]:
    """
    Get current authenticated customer from JWT token, or None if not authenticated
    """
    if token is None:
        return None
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        customer_id: str = payload.get("customer_id")
        
        if email is None or customer_id is None:
            return None
    except JWTError:
        return None
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == UUID(customer_id)).first()
    if customer is None:
        return None
    
    return {
        "email": email,
        "customer_id": customer_id
    }


async def get_current_driver(token: str = Depends(driver_oauth2_scheme), db: Session = Depends(get_db)) -> dict:
    """
    Get current authenticated driver from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        driver_id: str = payload.get("driver_id")
        
        if email is None or driver_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Verify driver exists and is active
    driver = db.query(Driver).filter(Driver.id == UUID(driver_id)).first()
    if driver is None or not driver.is_active:
        raise credentials_exception
    
    return {
        "email": email,
        "driver_id": driver_id
    }


async def get_current_admin(credentials: HTTPAuthorizationCredentials | None = Depends(admin_oauth2_scheme), db: Session = Depends(get_db)) -> dict:
    """
    Get current authenticated admin user from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials:
        raise credentials_exception
    
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        admin_id: str = payload.get("admin_id")
        role: str = payload.get("role")
        
        if email is None or admin_id is None:
            raise credentials_exception
    except JWTError as e:
        raise credentials_exception
    except Exception as e:
        raise credentials_exception
    
    # Verify admin user exists and is active
    try:
        admin = db.query(AdminUser).filter(AdminUser.id == UUID(admin_id)).first()
        if admin is None or not admin.is_active:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    return {
        "email": email,
        "admin_id": admin_id,
        "role": role,
        "permissions": admin.permissions
    }


async def get_current_chef(token: str = Depends(chef_oauth2_scheme), db: Session = Depends(get_db)) -> dict:
    """
    Get current authenticated chef from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        chef_id: str = payload.get("chef_id")
        
        if email is None or chef_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Verify chef exists and is active
    chef = db.query(Chef).filter(Chef.id == UUID(chef_id)).first()
    if chef is None or not chef.is_active:
        raise credentials_exception
    
    return {
        "email": email,
        "chef_id": chef_id
    }
