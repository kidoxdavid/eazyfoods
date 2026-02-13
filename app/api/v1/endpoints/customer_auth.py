"""
Customer authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.models.customer import Customer
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.schemas.customer import CustomerSignup, CustomerResponse

router = APIRouter()


class GoogleTokenBody(BaseModel):
    id_token: str


@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def customer_signup(
    customer_data: CustomerSignup,
    db: Session = Depends(get_db)
):
    """Customer signup"""
    # Check if email already exists
    existing = db.query(Customer).filter(Customer.email == customer_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create customer
    customer = Customer(
        email=customer_data.email,
        password_hash=get_password_hash(customer_data.password),
        first_name=customer_data.first_name,
        last_name=customer_data.last_name,
        phone=customer_data.phone,
        is_email_verified=False
    )
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    
    return {
        "message": "Customer account created successfully",
        "customer_id": str(customer.id)
    }


@router.post("/login", response_model=dict)
async def customer_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Customer login"""
    customer = db.query(Customer).filter(Customer.email == form_data.username).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not customer.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google sign-in. Please use Sign in with Google.",
        )
    if not verify_password(form_data.password, customer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": customer.email, "customer_id": str(customer.id)},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer_id": str(customer.id)
    }


@router.post("/google", response_model=dict)
async def customer_google(body: GoogleTokenBody):
    """Google sign-in disabled temporarily."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google sign-in is temporarily disabled. Please use email and password.",
    )

