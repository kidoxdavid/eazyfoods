"""
Payment processing endpoints: Stripe and Helcim.
Stripe works embedded (no iframe blocking); Helcim can block on some origins.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
from uuid import UUID
import httpx
import json
import stripe
from app.core.database import get_db
from app.core.config import settings
from app.api.v1.dependencies import get_current_customer
from app.models.order import Order

router = APIRouter()

# Helcim API base URL
HELCIM_API_URL = settings.HELCIM_API_URL or "https://api.helcim.com/v2"


@router.get("/config")
async def get_payment_config(db: Session = Depends(get_db)):
    """Get payment configuration (gateway, enabled gateways, and whether payments are suspended on customer side)."""
    from app.models.platform_settings import PlatformSettings
    gateway = (settings.PAYMENT_GATEWAY or "stripe").lower()
    sk = (settings.STRIPE_SECRET_KEY or "")
    res = {
        "gateway": gateway,
        "stripe_enabled": bool(sk and settings.STRIPE_PUBLISHABLE_KEY),
        "helcim_enabled": bool(settings.HELCIM_API_TOKEN),
        "test_mode": getattr(settings, "HELCIM_TEST_MODE", False),
        "payments_suspended": False,
    }
    payment_settings = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "payment").first()
    if payment_settings and isinstance(getattr(payment_settings, "settings_data", None), dict):
        res["payments_suspended"] = bool(payment_settings.settings_data.get("payments_suspended", False))
    if settings.STRIPE_PUBLISHABLE_KEY:
        res["stripe_publishable_key"] = settings.STRIPE_PUBLISHABLE_KEY
    if sk:
        res["stripe_key_prefix"] = sk[:24] + "..." if len(sk) > 24 else sk[:12] + "..."
    return res


@router.post("/create-payment-intent")
async def create_payment_intent(
    order_data: dict,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """
    Create a payment intent for the requested gateway (or configured default).
    - Stripe: returns client_secret and payment_intent_id for Stripe.js / Elements.
    - Helcim: returns checkoutToken and secretToken for HelcimPay.js iframe.
    Request body may include "gateway": "stripe" | "helcim" to match the customer's choice on checkout.
    """
    requested = (order_data.get("gateway") or "").strip().lower()
    gateway = requested if requested in ("stripe", "helcim") else (settings.PAYMENT_GATEWAY or "stripe").lower()
    total_amount = order_data.get("total_amount", 0)
    amount_cents = int(round(float(total_amount) * 100))

    if amount_cents <= 0:
        raise HTTPException(status_code=400, detail="Invalid order amount")

    print(f"[Payments] create-payment-intent called: gateway={gateway}, amount_cents={amount_cents}")

    # ----- Stripe -----
    if gateway == "stripe":
        if not settings.STRIPE_SECRET_KEY:
            raise HTTPException(status_code=503, detail="Stripe is not configured. Please contact support.")
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="cad",
                automatic_payment_methods={"enabled": True},
            )
            # Test payments show at https://dashboard.stripe.com/test/payments (toggle Test mode ON)
            key_preview = (settings.STRIPE_SECRET_KEY or "")[:12]
            print(f"[Stripe] PaymentIntent created: {intent.id} amount={amount_cents} cents | key={key_preview}... | View: https://dashboard.stripe.com/test/payments")
            sk = (settings.STRIPE_SECRET_KEY or "")
            key_prefix = sk[:24] + "..." if len(sk) > 24 else sk[:12] + "..."
            return {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id,
                "amount": float(total_amount),
                "currency": "CAD",
                "stripe_key_prefix": key_prefix,
            }
        except stripe.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e.user_message or str(e)))

    # ----- Helcim -----
    if gateway != "helcim":
        raise HTTPException(status_code=400, detail="Payment gateway not supported")
    
    if not settings.HELCIM_API_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Helcim is not configured. Please contact support."
        )
    
    try:
        customer_id = UUID(current_customer["customer_id"])
        amount = round(float(order_data.get("total_amount", 0)), 2)
        
        headers = {
            "api-token": settings.HELCIM_API_TOKEN,
            "Content-Type": "application/json",
            "accept": "application/json",
        }
        payload = {
            "paymentType": "purchase",
            "amount": amount,
            "currency": "CAD",
            "test": settings.HELCIM_TEST_MODE,
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{HELCIM_API_URL}/helcim-pay/initialize",
                headers=headers,
                json=payload,
                timeout=15.0,
            )
        
        if resp.status_code != 200:
            err = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
            msg = err.get("errors") or err.get("message") or resp.text
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Helcim initialize failed: {msg}"
            )
        
        data = resp.json()
        checkout_token = data.get("checkoutToken")
        secret_token = data.get("secretToken")
        if not checkout_token or not secret_token:
            raise HTTPException(
                status_code=500,
                detail="Helcim did not return checkoutToken and secretToken"
            )
        
        return {
            "payment_token": checkout_token,
            "checkout_token": checkout_token,
            "secret_token": secret_token,
            "amount": amount,
            "currency": "CAD",
        }
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error calling Helcim: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating payment: {str(e)}"
        )


def _validate_helcim_hash(raw_data: dict, secret_token: str, helcim_hash: str) -> bool:
    """Validate HelcimPay.js transaction response hash (sha256(json_data + secretToken))."""
    import hashlib
    # Try canonical JSON (sort_keys) first; some integrations use key order from response
    for sort_keys in (True, False):
        cleaned = json.dumps(raw_data, separators=(",", ":"), sort_keys=sort_keys)
        our_hash = hashlib.sha256((cleaned + secret_token).encode()).hexdigest()
        if our_hash == helcim_hash:
            return True
    return False


@router.post("/validate-helcim-response")
async def validate_helcim_response(
    body: dict,
    current_customer: dict = Depends(get_current_customer),
):
    """
    Validate the transaction response from HelcimPay.js iframe (SUCCESS event).
    Verifies the hash and returns transaction_id for the frontend to complete checkout.
    """
    if not settings.HELCIM_API_TOKEN:
        raise HTTPException(status_code=503, detail="Helcim is not configured.")
    
    raw_data = body.get("rawDataResponse") or body.get("raw_data_response")
    checkout_token = body.get("checkoutToken") or body.get("checkout_token")
    secret_token = body.get("secretToken") or body.get("secret_token")
    
    if not raw_data or not secret_token:
        raise HTTPException(
            status_code=400,
            detail="rawDataResponse and secretToken are required"
        )
    
    helcim_hash = body.get("hash")
    if not helcim_hash:
        raise HTTPException(status_code=400, detail="Hash is required for validation")
    
    if not _validate_helcim_hash(raw_data, secret_token, helcim_hash):
        raise HTTPException(status_code=400, detail="Invalid response hash")
    
    transaction_id = raw_data.get("transactionId") or raw_data.get("transaction_id")
    status = raw_data.get("status", "")
    if not transaction_id:
        raise HTTPException(status_code=400, detail="No transactionId in response")
    if str(status).upper() not in ("APPROVED", "APPROVAL", "1"):
        raise HTTPException(
            status_code=400,
            detail=f"Transaction not approved: {status}"
        )
    
    return {
        "status": "success",
        "transaction_id": str(transaction_id),
        "message": "Payment validated",
    }


@router.post("/process-payment")
async def process_payment(
    payment_data: dict,
    request: Request,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """
    Process a payment with Helcim using card token
    """
    if settings.PAYMENT_GATEWAY != "helcim":
        raise HTTPException(
            status_code=400,
            detail="Helcim is not the configured payment gateway"
        )
    
    if not settings.HELCIM_API_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Helcim is not configured"
        )
    
    try:
        payment_token = payment_data.get("payment_token")
        card_token = payment_data.get("card_token")  # This should be a Helcim cardToken, not card number
        amount = payment_data.get("amount")
        order_id = payment_data.get("order_id")
        card_data = payment_data.get("card_data", {})
        
        if not payment_token or not amount:
            raise HTTPException(
                status_code=400,
                detail="payment_token and amount are required"
            )
        
        # Helcim does not allow full card numbers via API. Only accept a real card token from HelcimPay.js.
        has_card_token = card_token and len(card_token) > 10 and not card_token.isdigit()
        has_card_data = card_data.get("card_number") and card_data.get("expiry_date") and card_data.get("cvv")
        
        if has_card_data:
            raise HTTPException(
                status_code=400,
                detail="Sending full card numbers is not allowed. Please use the secure payment window (refresh the page and use Pay & Place Order to open it)."
            )
        if not has_card_token:
            raise HTTPException(
                status_code=400,
                detail="A payment token is required. Please use the secure payment window: click Pay & Place Order to open it, then enter your card there."
            )
        
        import uuid
        
        # Generate idempotency key (required by Helcim API v2)
        idempotency_key = str(uuid.uuid4()).replace("-", "")[:25]
        
        headers = {
            "api-token": settings.HELCIM_API_TOKEN,
            "Content-Type": "application/json",
            "accept": "application/json",
            "idempotency-key": idempotency_key
        }
        
        # Get client IP address (required by Helcim)
        client_ip = request.client.host if request.client else "127.0.0.1"
        # Check for forwarded IP (if behind proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Build payload for Helcim purchase transaction
        transaction_amount = round(float(amount), 2)
        
        payload = {
            "amount": transaction_amount,
            "transactionAmount": transaction_amount,
            "currency": "CAD",
            "paymentType": "purchase",
            "ipAddress": client_ip
        }
        
        # Use card token if available (preferred - PCI compliant)
        if has_card_token:
            payload["cardToken"] = card_token
            print(f"Using card token for payment (PCI compliant method)")
        else:
            # Fall back to full card data (requires account approval from Helcim)
            card_number = card_data.get("card_number", "").replace(" ", "").strip()
            expiry_date = card_data.get("expiry_date", "").strip()
            cvv = card_data.get("cvv", "").strip()
            cardholder_name = card_data.get("cardholder_name", "").strip()
            
            # Format expiry: MM/YY -> MMYY (Helcim expects MMYY format)
            card_expiry = expiry_date.replace("/", "").replace(" ", "").strip()
            
            # Validate required fields
            if not card_number or len(card_number) < 13 or len(card_number) > 19:
                raise HTTPException(status_code=400, detail="Invalid card number")
            if not card_expiry or len(card_expiry) != 4 or not card_expiry.isdigit():
                raise HTTPException(status_code=400, detail=f"Invalid expiry date format. Expected MMYY, got: {expiry_date}")
            if not cvv or len(cvv) < 3 or len(cvv) > 4 or not cvv.isdigit():
                raise HTTPException(status_code=400, detail="Invalid CVV")
            if not cardholder_name:
                raise HTTPException(status_code=400, detail="Cardholder name is required")
            
            payload["cardData"] = {
                "cardNumber": card_number,
                "cardExpiry": card_expiry,  # Format: MMYY (e.g., "1225" for Dec 2025)
                "cardCVV": cvv,
                "cardHolderName": cardholder_name
            }
            print(f"Using full card data (requires Helcim account approval for direct card processing)")
        
        # Add test flag if in test mode
        if settings.HELCIM_TEST_MODE:
            payload["test"] = True
        
        # Log payload (mask sensitive data)
        safe_payload = {**payload}
        if 'cardToken' in payload:
            safe_payload['cardToken'] = payload['cardToken'][:10] + '***' if len(payload['cardToken']) > 10 else '***'
        elif 'cardData' in payload:
            card_number = payload['cardData'].get('cardNumber', '')
            safe_payload['cardData'] = {
                **payload['cardData'],
                'cardCVV': '***',
                'cardNumber': card_number[:4] + '****' + card_number[-4:] if len(card_number) > 8 else '****'
            }
        print(f"Helcim Payment Payload: {json.dumps(safe_payload, indent=2)}")
        print(f"Idempotency Key: {idempotency_key}")
        
        # Process payment with Helcim
        async with httpx.AsyncClient() as client:
            try:
                # Try the purchase endpoint - correct path is /payment/purchase
                response = await client.post(
                    f"{HELCIM_API_URL}/payment/purchase",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                # Log response for debugging
                print(f"Helcim API Response Status: {response.status_code}")
                print(f"Helcim API Response Headers: {dict(response.headers)}")
                print(f"Helcim API Response Text (full): {response.text}")
                
                # Check if response is JSON
                content_type = response.headers.get("content-type", "")
                if "application/json" not in content_type:
                    # Response might be HTML or text
                    raise HTTPException(
                        status_code=500,
                        detail=f"Helcim API returned non-JSON response. Status: {response.status_code}, Content-Type: {content_type}, Response: {response.text[:200]}"
                    )
                
                # Parse JSON response
                try:
                    data = response.json()
                    print(f"Helcim API Response Data: {json.dumps(data, indent=2)}")
                except json.JSONDecodeError as e:
                    # Handle JSON parsing errors
                    print(f"JSON Decode Error: {e}")
                    print(f"Response text: {response.text}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Helcim API returned invalid JSON. Response: {response.text[:500]}"
                    )
                
                # Check for errors in response (Helcim might return 200 with error in body)
                # First check HTTP status
                if response.status_code != 200:
                    error_msg = (
                        data.get("message") or 
                        data.get("error") or 
                        data.get("responseMessage") or
                        data.get("details") or
                        data.get("response") or
                        str(data)
                    )
                    print(f"Helcim Error Response (HTTP {response.status_code}): {json.dumps(data, indent=2)}")
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Helcim payment failed: {error_msg}"
                    )
                
                # Check for errors in response body even if HTTP status is 200
                # Helcim might return 200 but with error details in the response
                errors = data.get("errors") or data.get("error") or {}
                if errors:
                    # Extract error messages from errors object
                    if isinstance(errors, dict):
                        error_messages = []
                        for key, value in errors.items():
                            if isinstance(value, list):
                                error_messages.extend([f"{key}: {v}" for v in value])
                            else:
                                error_messages.append(f"{key}: {value}")
                        error_msg = "; ".join(error_messages) if error_messages else str(errors)
                    else:
                        error_msg = str(errors)
                    
                    print(f"Helcim Error in Response Body: {json.dumps(data, indent=2)}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Helcim payment failed: {error_msg}"
                    )
                
                # Check response code field (Helcim uses response codes like "1" for success, others for errors)
                response_code = data.get("response") or data.get("responseCode")
                if response_code and str(response_code) not in ["1", "APPROVED", "approved"]:
                    error_msg = (
                        data.get("message") or 
                        data.get("responseMessage") or
                        f"Transaction declined (response code: {response_code})"
                    )
                    print(f"Helcim Transaction Declined: {json.dumps(data, indent=2)}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Helcim payment failed: {error_msg}"
                    )
            except httpx.HTTPError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error connecting to Helcim: {str(e)}"
                )
            
            # Helcim API response format - check multiple possible success indicators
            transaction_id = data.get("transactionId") or data.get("transaction_id") or data.get("id")
            status = data.get("status")
            response_code = data.get("response") or data.get("responseCode")
            
            # Helcim v2 typically returns status: "APPROVED" for success
            is_success = (
                status == "APPROVED" or
                status == "approved" or
                response_code == "1" or 
                response_code == "APPROVED" or
                (transaction_id and status and status.upper() != "DECLINED" and status.upper() != "FAILED")
            )
            
            print(f"Helcim Response Analysis: status={status}, response_code={response_code}, transaction_id={transaction_id}, is_success={is_success}")
            
            # Update order if order_id provided
            if order_id:
                order = db.query(Order).filter(Order.id == UUID(order_id)).first()
                if order:
                    customer_id = UUID(current_customer["customer_id"])
                    if order.customer_id != customer_id:
                        raise HTTPException(status_code=403, detail="Unauthorized")
                    
                    if is_success:
                        order.payment_status = "paid"
                        order.payment_method = "helcim"
                        if transaction_id:
                            order.helcim_transaction_id = str(transaction_id)
                        db.commit()
                    else:
                        order.payment_status = "failed"
                        db.commit()
            
            return {
                "status": "success" if is_success else "failed",
                "message": data.get("message") or data.get("responseMessage") or ("Payment processed" if is_success else "Payment failed"),
                "transaction_id": str(transaction_id) if transaction_id else None,
                "order_id": str(order_id) if order_id else None
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error connecting to Helcim: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing payment: {str(e)}"
        )


@router.post("/webhook")
async def helcim_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Helcim webhooks for payment events
    """
    try:
        payload = await request.json()
        event_type = payload.get("eventType")
        transaction_id = payload.get("transactionId")
        
        if event_type == "payment.completed":
            # Find order by transaction ID
            order = db.query(Order).filter(
                Order.helcim_transaction_id == transaction_id
            ).first()
            
            if order:
                order.payment_status = "paid"
                order.payment_method = "helcim"
                db.commit()
        
        elif event_type == "payment.failed":
            order = db.query(Order).filter(
                Order.helcim_transaction_id == transaction_id
            ).first()
            
            if order:
                order.payment_status = "failed"
                db.commit()
        
        return {"status": "success"}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing webhook: {str(e)}"
        )

