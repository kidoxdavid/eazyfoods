"""
Stripe webhooks: payment_intent.succeeded → create Transfers to vendor Connect accounts.
No auth; Stripe signs the payload (verify with STRIPE_WEBHOOK_SECRET).
"""
from fastapi import APIRouter, Request, HTTPException, Response, Depends
from sqlalchemy.orm import Session
import stripe
from app.core.database import get_db
from app.core.config import settings
from app.models.order import Order
from app.models.vendor import Vendor

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks. On payment_intent.succeeded, create Transfers to connected vendors."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None) or ""
    if not secret:
        return Response(status_code=200, content=b"ok")
    try:
        event = stripe.Webhook.construct_event(payload, sig, secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] != "payment_intent.succeeded":
        return {"received": True}

    pi = event["data"]["object"]
    payment_intent_id = pi.get("id")
    if not payment_intent_id:
        return {"received": True}

    stripe.api_key = settings.STRIPE_SECRET_KEY
    # Vendor orders (marketplace vendors)
    vendor_orders = (
        db.query(Order)
        .filter(
            Order.stripe_payment_intent_id == payment_intent_id,
            Order.vendor_id.isnot(None),
            Order.stripe_transfer_id.is_(None),
        )
        .all()
    )
    for order in vendor_orders:
        if not order.vendor_id or order.stripe_transfer_id:
            continue
        vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
        if not vendor or not vendor.stripe_connect_account_id:
            continue
        net_cents = int(round(float(order.net_payout) * 100))
        if net_cents <= 0:
            continue
        try:
            t = stripe.Transfer.create(
                amount=net_cents,
                currency="cad",
                destination=vendor.stripe_connect_account_id,
                description=f"Order {order.order_number}",
            )
            order.stripe_transfer_id = t.id
            db.commit()
        except stripe.StripeError:
            db.rollback()
            continue

    # Chef orders (chef_id set, vendor_id is null)
    chef_orders = (
        db.query(Order)
        .filter(
            Order.stripe_payment_intent_id == payment_intent_id,
            Order.vendor_id.is_(None),
            Order.chef_id.isnot(None),
            Order.stripe_transfer_id.is_(None),
        )
        .all()
    )
    from app.models.chef import Chef  # imported lazily to avoid circular import at module level

    for order in chef_orders:
        if not order.chef_id or order.stripe_transfer_id:
            continue
        chef = db.query(Chef).filter(Chef.id == order.chef_id).first()
        if not chef or not chef.stripe_connect_account_id:
            continue
        net_cents = int(round(float(order.net_payout) * 100))
        if net_cents <= 0:
            continue
        try:
            t = stripe.Transfer.create(
                amount=net_cents,
                currency="cad",
                destination=chef.stripe_connect_account_id,
                description=f"Chef order {order.order_number}",
            )
            order.stripe_transfer_id = t.id
            db.commit()
        except stripe.StripeError:
            db.rollback()
            continue
    return {"received": True}
