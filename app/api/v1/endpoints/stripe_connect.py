"""
Stripe Connect: vendor onboarding (Express accounts) and status.
Payouts to connected accounts are triggered by the Stripe webhook (payment_intent.succeeded).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from uuid import UUID
import stripe
from app.core.database import get_db
from app.core.config import settings
from app.models.vendor import Vendor
from app.api.v1.dependencies import get_current_vendor

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
async def stripe_connect_status(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db),
):
    """Return whether the vendor has connected Stripe and onboarding state."""
    vendor_id = UUID(current_vendor["vendor_id"])
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if not vendor.stripe_connect_account_id:
        return {
            "connected": False,
            "onboarding_complete": False,
            "account_id": None,
            "details_submitted": False,
        }
    try:
        _stripe()
        acc = stripe.Account.retrieve(vendor.stripe_connect_account_id)
        details_submitted = getattr(acc, "details_submitted", False)
        charges_enabled = getattr(acc, "charges_enabled", False)
        # Persist so we don't have to call Stripe every time
        if details_submitted != vendor.stripe_connect_details_submitted:
            vendor.stripe_connect_details_submitted = bool(details_submitted)
            db.commit()
        return {
            "connected": True,
            "onboarding_complete": bool(details_submitted and charges_enabled),
            "account_id": vendor.stripe_connect_account_id,
            "details_submitted": bool(details_submitted),
        }
    except stripe.StripeError as e:
        return {
            "connected": True,
            "onboarding_complete": False,
            "account_id": vendor.stripe_connect_account_id,
            "details_submitted": bool(vendor.stripe_connect_details_submitted),
            "error": str(e),
        }


@router.post("/onboard")
async def stripe_connect_onboard(
    request: Request,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db),
):
    """
    Create or refresh Stripe Connect Express account and return an onboarding URL.
    Vendor should be redirected to the returned URL to complete onboarding on Stripe.
    """
    vendor_id = UUID(current_vendor["vendor_id"])
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    stripe_api = _stripe()

    # Base URL for return/refresh (vendor portal)
    base = (
        request.headers.get("origin")
        or getattr(settings, "VENDOR_PORTAL_BASE_URL", None)
        or ""
    ).rstrip("/")
    if not base:
        base = "http://localhost:5174"
    return_url = f"{base}/profile?stripe=return"
    refresh_url = f"{base}/profile?stripe=refresh"

    try:
        if not vendor.stripe_connect_account_id:
            account = stripe_api.Account.create(
                type="express",
                country="CA",
                capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
                business_profile={
                    "url": getattr(settings, "API_PUBLIC_URL", None) or "",
                    "mcc": "5411",
                },
            )
            vendor.stripe_connect_account_id = account.id
            vendor.stripe_connect_details_submitted = False
            db.commit()
            db.refresh(vendor)
        account_id = vendor.stripe_connect_account_id
        link = stripe_api.AccountLink.create(
            account=account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
        )
        return {"url": link.url, "expires_in": getattr(link, "expires_at", None)}
    except stripe.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {str(e)}",
        )
