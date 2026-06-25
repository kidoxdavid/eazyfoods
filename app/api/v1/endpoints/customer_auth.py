"""
Customer authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import timedelta
from app.core.database import get_db
from app.models.customer import Customer
from app.core.security import verify_password, get_password_hash, create_access_token, create_email_verification_token, decode_access_token, create_password_reset_token
from app.core.config import settings
from app.schemas.customer import CustomerSignup, CustomerResponse

router = APIRouter()


class GoogleTokenBody(BaseModel):
    id_token: str | None = None
    credential: str | None = None  # Some clients send credential instead of id_token


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


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

    # Send verification email (uses SMTP when configured; otherwise logs link for dev)
    try:
        token = create_email_verification_token(customer.email)
        from app.core.email import send_verification_email
        send_verification_email(customer.email, token, portal="customer")
    except Exception:
        pass

    return {
        "message": "Customer account created. Please check your email to verify your address and complete signup.",
        "customer_id": str(customer.id),
        "verification_sent": True
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
        "customer_id": str(customer.id),
        "is_email_verified": bool(customer.is_email_verified),
    }


@router.post("/resend-verification", response_model=dict)
async def resend_verification_email(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Resend email verification link. Always returns success to prevent enumeration."""
    customer = db.query(Customer).filter(Customer.email == body.email.strip().lower()).first()
    if customer and not customer.is_email_verified:
        try:
            token = create_email_verification_token(customer.email)
            from app.core.email import send_verification_email
            send_verification_email(customer.email, token, portal="customer")
        except Exception:
            pass
    return {"message": "If an unverified account exists with this email, a new verification link has been sent."}


@router.post("/google", response_model=dict)
async def customer_google(
    body: GoogleTokenBody,
    db: Session = Depends(get_db),
):
    """Sign in or sign up with Google (customer portal only)."""
    import logging
    from app.core.google_auth import verify_google_id_token

    logger = logging.getLogger(__name__)

    token = body.id_token or body.credential
    if not token or not str(token).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Google token. Please try again.",
        )

    if not getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None) or not str(settings.GOOGLE_OAUTH_CLIENT_ID).strip():
        logger.error("GOOGLE_OAUTH_CLIENT_ID not configured on server")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured. Please use email and password.",
        )

    try:
        payload = await verify_google_id_token(token)
        if not payload or not payload.get("email"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token. Please try again.",
            )

        email = payload["email"]
        parts = (payload.get("name") or "").strip().split(None, 1)
        first_name = payload.get("given_name") or (parts[0] if parts else "User")
        last_name = payload.get("family_name") or (parts[1] if len(parts) > 1 else "")

        customer = db.query(Customer).filter(Customer.email == email).first()
        if not customer:
            customer = Customer(
                email=email,
                password_hash=None,
                first_name=(first_name or "User").strip() or "User",
                last_name=(last_name or "").strip() or ".",
                phone=None,
                is_email_verified=True,
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": customer.email, "customer_id": str(customer.id)},
            expires_delta=access_token_expires,
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "customer_id": str(customer.id),
        }
    except HTTPException:
        raise
    except IntegrityError as e:
        logger.exception("Google sign-in DB error (run migration?): %s", e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not fully set up. Please use email and password, or run the database migration (add_google_oauth_columns.sql) on production.",
        )
    except Exception as e:
        logger.exception("Google sign-in failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google sign-in failed. Please try again or use email and password.",
        )


@router.post("/forgot-password", response_model=dict)
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset. Always returns success to avoid email enumeration."""
    customer = db.query(Customer).filter(Customer.email == body.email.strip().lower()).first()
    if customer and customer.password_hash:
        token = create_password_reset_token(customer.email)
        from app.core.email import send_password_reset_email
        send_password_reset_email(customer.email, token, portal="customer")
    return {"message": "If an account exists with this email, you will receive a password reset link."}


@router.post("/reset-password", response_model=dict)
async def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token from email link."""
    payload = decode_access_token(body.token)
    if not payload or payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link.")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset link.")
    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    customer.password_hash = get_password_hash(body.new_password)
    db.commit()
    return {"message": "Password updated. You can now log in with your new password."}


@router.get("/verify-email", response_model=dict)
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify customer email from link. Token is a JWT with sub=email and purpose=email_verification."""
    payload = decode_access_token(token)
    if not payload or payload.get("purpose") != "email_verification":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link.")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification link.")
    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    customer.is_email_verified = True
    db.commit()
    return {"message": "Email verified. You can now log in.", "verified": True}

