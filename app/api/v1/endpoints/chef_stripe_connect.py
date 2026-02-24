"""
Stripe Connect: chef onboarding (Express accounts) and status.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from uuid import UUID
import stripe

from app.core.database import get_db
from app.core.config import settings
from app.models.chef import Chef
from app.api.v1.dependencies import get_current_chef

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
async def chef_stripe_connect_status(
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db),
):
    """Return whether the chef has connected Stripe and onboarding state."""
    chef_id = UUID(current_chef["chef_id"])
    chef = db.query(Chef).filter(Chef.id == chef_id).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    if not chef.stripe_connect_account_id:
        return {
            "connected": False,
            "onboarding_complete": False,
            "account_id": None,
            "details_submitted": False,
        }
    try:
        _stripe()
        acc = stripe.Account.retrieve(chef.stripe_connect_account_id)
        details_submitted = getattr(acc, "details_submitted", False)
        charges_enabled = getattr(acc, "charges_enabled", False)
        if details_submitted != chef.stripe_connect_details_submitted:
            chef.stripe_connect_details_submitted = bool(details_submitted)
            db.commit()
        return {
            "connected": True,
            "onboarding_complete": bool(details_submitted and charges_enabled),
            "account_id": chef.stripe_connect_account_id,
            "details_submitted": bool(details_submitted),
        }
    except stripe.error.StripeError as e:
        return {
            "connected": True,
            "onboarding_complete": False,
            "account_id": chef.stripe_connect_account_id,
            "details_submitted": bool(chef.stripe_connect_details_submitted),
            "error": str(e),
        }


@router.post("/onboard")
async def chef_stripe_connect_onboard(
    request: Request,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db),
):
    """Create or refresh Stripe Connect Express account and return an onboarding URL for the chef."""
    chef_id = UUID(current_chef["chef_id"])
    chef = db.query(Chef).filter(Chef.id == chef_id).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef not found")
    stripe_api = _stripe()

    base = (
        request.headers.get("origin")
        or getattr(settings, "CHEF_PORTAL_BASE_URL", None)
        or ""
    ).rstrip("/")
    if not base:
        base = "http://localhost:5175"
    return_url = f"{base}/payouts?stripe=return"
    refresh_url = f"{base}/payouts?stripe=refresh"

    try:
        if not chef.stripe_connect_account_id:
            account = stripe_api.Account.create(
                type="express",
                country="CA",
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                business_profile={
                    "url": getattr(settings, "API_PUBLIC_URL", None) or "",
                    "mcc": "5812",
                },
            )
            chef.stripe_connect_account_id = account.id
            chef.stripe_connect_details_submitted = False
            db.commit()
            db.refresh(chef)
        account_id = chef.stripe_connect_account_id
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

