"""
Stripe Connect: driver onboarding (Express accounts) and status.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from uuid import UUID
import stripe

from app.core.database import get_db
from app.core.config import settings
from app.models.driver import Driver
from app.api.v1.dependencies import get_current_driver

router = APIRouter()


def _stripe():
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured",
        )
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


@router.get("/status")
async def driver_stripe_connect_status(
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db),
):
    """Return whether the driver has connected Stripe and onboarding state."""
    driver_id = UUID(current_driver["driver_id"])
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if not driver.stripe_connect_account_id:
        return {
            "connected": False,
            "onboarding_complete": False,
            "account_id": None,
            "details_submitted": False,
        }
    try:
        _stripe()
        acc = stripe.Account.retrieve(driver.stripe_connect_account_id)
        details_submitted = getattr(acc, "details_submitted", False)
        charges_enabled = getattr(acc, "charges_enabled", False)
        if details_submitted != driver.stripe_connect_details_submitted:
            driver.stripe_connect_details_submitted = bool(details_submitted)
            db.commit()
        return {
            "connected": True,
            "onboarding_complete": bool(details_submitted and charges_enabled),
            "account_id": driver.stripe_connect_account_id,
            "details_submitted": bool(details_submitted),
        }
    except stripe.error.StripeError as e:
        return {
            "connected": True,
            "onboarding_complete": False,
            "account_id": driver.stripe_connect_account_id,
            "details_submitted": bool(driver.stripe_connect_details_submitted),
            "error": str(e),
        }


@router.post("/onboard")
async def driver_stripe_connect_onboard(
    request: Request,
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db),
):
    """Create or refresh Stripe Connect Express account and return an onboarding URL for the driver."""
    driver_id = UUID(current_driver["driver_id"])
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    stripe_api = _stripe()

    base = (
        request.headers.get("origin")
        or getattr(settings, "DRIVER_PORTAL_BASE_URL", None)
        or ""
    ).rstrip("/")
    if not base:
        base = "http://localhost:5176"
    return_url = f"{base}/profile?stripe=return"
    refresh_url = f"{base}/profile?stripe=refresh"

    try:
        if not driver.stripe_connect_account_id:
            account = stripe_api.Account.create(
                type="express",
                country="CA",
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                business_profile={
                    "url": getattr(settings, "API_PUBLIC_URL", None) or "",
                    "mcc": "4215",
                },
            )
            driver.stripe_connect_account_id = account.id
            driver.stripe_connect_details_submitted = False
            db.commit()
            db.refresh(driver)
        account_id = driver.stripe_connect_account_id
        link = stripe_api.AccountLink.create(
            account=account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
        )
        return {"url": link.url, "expires_at": getattr(link, "expires_at", None)}
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {str(e)}",
        )

