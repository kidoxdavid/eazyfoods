"""
Customer cart and checkout endpoints
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.vendor import Vendor
from app.models.coupon import Coupon, CouponUsage
from app.api.v1.dependencies import get_optional_customer
from app.models.customer import Customer
from app.models.platform_settings import PlatformSettings
from decimal import Decimal
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_platform_delivery_fee(db: Session) -> Decimal:
    """Get default delivery fee from admin orders settings."""
    ps = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "orders").first()
    if ps and isinstance(getattr(ps, "settings_data", None), dict):
        fee = ps.settings_data.get("delivery_fee")
        if fee is not None:
            try:
                return Decimal(str(fee))
            except Exception:
                pass
    return Decimal("5.00")


@router.post("/checkout", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: dict = Body(...),
    current_customer: Optional[dict] = Depends(get_optional_customer),
    db: Session = Depends(get_db)
):
    """Create orders from cart items (vendor products and/or chef cuisines). Supports guest checkout when allow_guest_checkout is true."""
    from uuid import UUID
    from app.models.cuisine import Cuisine
    from app.models.chef import Chef
    from app.models.customer import CustomerAddress

    def _parse_quantity(value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    try:
        # Resolve customer: authenticated or guest
        if current_customer:
            customer_id = UUID(current_customer["customer_id"])
        else:
            ps = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "customer").first()
            allow_guest = True
            if ps and isinstance(getattr(ps, "settings_data", None), dict):
                allow_guest = bool(ps.settings_data.get("allow_guest_checkout", True))
            if not allow_guest:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please log in to place an order.")

            guest_email = (order_data.get("guest_email") or "").strip()
            first_name = (order_data.get("guest_first_name") or order_data.get("first_name") or "").strip()
            last_name = (order_data.get("guest_last_name") or order_data.get("last_name") or "").strip()
            if not guest_email or not first_name or not last_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Guest checkout requires email, first name, and last name."
                )

            guest = db.query(Customer).filter(Customer.email == guest_email).first()
            if not guest:
                guest = Customer(
                    email=guest_email,
                    first_name=first_name,
                    last_name=last_name,
                    phone=order_data.get("guest_phone") or None,
                    password_hash=None,
                    is_email_verified=False,
                )
                db.add(guest)
                db.flush()
            customer_id = guest.id

        items = order_data.get("items", []) or []
        delivery_method = order_data.get("delivery_method", "delivery")
        delivery_address_id = order_data.get("delivery_address_id")
        coupon_code = order_data.get("coupon_code")
        address_data = order_data.get("address") or {}

        if not items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        if delivery_method == "delivery" and address_data and not delivery_address_id:
            delivery_address = CustomerAddress(
                customer_id=customer_id,
                street_address=address_data.get("street_address", ""),
                city=address_data.get("city", ""),
                state=address_data.get("state", ""),
                postal_code=address_data.get("postal_code", ""),
                country=address_data.get("country", "Canada"),
                is_default=False,
                latitude=address_data.get("latitude"),
                longitude=address_data.get("longitude")
            )
            db.add(delivery_address)
            db.flush()
            delivery_address_id = str(delivery_address.id)

        coupon = None
        if coupon_code:
            coupon = db.query(Coupon).filter(Coupon.code == coupon_code.upper().strip()).first()
            if coupon:
                now = datetime.utcnow()
                if not (coupon.is_active and coupon.approval_status == "approved" and
                        coupon.start_date <= now and coupon.end_date >= now and
                        (not coupon.usage_limit or coupon.usage_count < coupon.usage_limit)):
                    coupon = None

        product_items = []
        cuisine_items = []
        for item in items:
            if not isinstance(item, dict):
                continue
            qty = _parse_quantity(item.get("quantity", 0))
            if qty <= 0:
                continue
            if item.get("product_id"):
                product_items.append({"product_id": item["product_id"], "quantity": qty})
            elif item.get("chef_id") and item.get("cuisine_id"):
                cuisine_items.append({"chef_id": item["chef_id"], "cuisine_id": item["cuisine_id"], "quantity": qty})

        if not product_items and not cuisine_items:
            raise HTTPException(status_code=400, detail="Cart items are invalid or missing.")

        vendor_orders = {}
        for item in product_items:
            product_id = UUID(item["product_id"])
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item['product_id']} not found")
            if product.stock_quantity < item["quantity"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name}. Available: {product.stock_quantity}"
                )
            vendor_id = str(product.vendor_id)
            if vendor_id not in vendor_orders:
                vendor_orders[vendor_id] = {
                    "vendor": db.query(Vendor).filter(Vendor.id == product.vendor_id).first(),
                    "items": []
                }
            vendor_orders[vendor_id]["items"].append({"product": product, "quantity": item["quantity"]})

        chef_orders = {}
        for item in cuisine_items:
            chef_id = UUID(item["chef_id"])
            cuisine_id = UUID(item["cuisine_id"])
            cuisine = db.query(Cuisine).filter(Cuisine.id == cuisine_id, Cuisine.chef_id == chef_id).first()
            if not cuisine:
                raise HTTPException(status_code=404, detail=f"Cuisine {item['cuisine_id']} not found for chef")
            chef = db.query(Chef).filter(Chef.id == chef_id).first()
            if not chef or not chef.is_active:
                raise HTTPException(status_code=400, detail="Chef is not available")
            chef_id_str = str(chef_id)
            if chef_id_str not in chef_orders:
                chef_orders[chef_id_str] = {"chef": chef, "items": []}
            chef_orders[chef_id_str]["items"].append({"cuisine": cuisine, "quantity": item["quantity"]})

        pricing = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "pricing").first()
        vendor_markup_pct = 0.0
        chef_markup_pct = 0.0
        if pricing and isinstance(getattr(pricing, "settings_data", None), dict):
            try:
                vendor_markup_pct = max(0.0, float(pricing.settings_data.get("vendor_markup_percent") or 0))
            except (TypeError, ValueError):
                pass
            try:
                chef_markup_pct = max(0.0, float(pricing.settings_data.get("chef_markup_percent") or 0))
            except (TypeError, ValueError):
                pass
        vendor_markup_mult = Decimal("1") + (Decimal(str(vendor_markup_pct)) / Decimal("100"))
        chef_markup_mult = Decimal("1") + (Decimal(str(chef_markup_pct)) / Decimal("100"))

        created_orders = []
        payment_method = order_data.get("payment_method") or "stripe"
        helcim_transaction_id = order_data.get("helcim_transaction_id")
        stripe_payment_intent_id = order_data.get("stripe_payment_intent_id")
        payment_method = order_data.get("payment_method", "stripe" if stripe_payment_intent_id else "helcim" if helcim_transaction_id else "cash")

        with db.begin():
            for vendor_id, vendor_data in vendor_orders.items():
                vendor = vendor_data["vendor"]
                if not vendor:
                    raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

                subtotal_base = sum(item["product"].price * item["quantity"] for item in vendor_data["items"])
                subtotal = subtotal_base * vendor_markup_mult

                vendor_discount = Decimal("0.00")
                if coupon:
                    applicable = True
                    if coupon.applicable_to == "specific_vendors" and coupon.vendor_ids:
                        if str(vendor_id) not in coupon.vendor_ids:
                            applicable = False
                    if applicable:
                        if coupon.discount_type == "percentage":
                            discount = subtotal * (Decimal(str(coupon.discount_value)) / Decimal("100"))
                            if coupon.max_discount_amount:
                                discount = min(discount, Decimal(str(coupon.max_discount_amount)))
                            vendor_discount = discount
                        elif coupon.discount_type == "fixed_amount":
                            vendor_discount = min(Decimal(str(coupon.discount_value)), subtotal)
                        elif coupon.discount_type == "free_shipping" and delivery_method == "delivery":
                            _platform_fee = _get_platform_delivery_fee(db)
                            vendor_discount = _platform_fee

                tax_amount = (subtotal - vendor_discount) * Decimal("0.08")
                platform_delivery_fee = _get_platform_delivery_fee(db)
                if delivery_method != "delivery":
                    shipping_amount = Decimal("0.00")
                elif order_data.get("shipping_amount") is not None:
                    try:
                        shipping_amount = Decimal(str(order_data["shipping_amount"]))
                    except Exception:
                        shipping_amount = platform_delivery_fee
                else:
                    shipping_amount = platform_delivery_fee
                if coupon and coupon.discount_type == "free_shipping" and delivery_method == "delivery":
                    shipping_amount = Decimal("0.00")

                total_amount = subtotal - vendor_discount + tax_amount + shipping_amount

                if vendor.commission_rate is not None:
                    commission_rate = Decimal(str(vendor.commission_rate))
                else:
                    ps = db.query(PlatformSettings).filter(
                        PlatformSettings.setting_type == "commission"
                    ).first()
                    default_rate = 15
                    if ps and ps.settings_data and "default_commission_rate" in ps.settings_data:
                        default_rate = float(ps.settings_data["default_commission_rate"])
                    commission_rate = Decimal(str(default_rate))
                commission_amount = subtotal_base * (commission_rate / Decimal("100"))
                net_payout = subtotal_base - commission_amount
                order_number = f"EZF-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

                order = Order(
                    order_number=order_number,
                    vendor_id=UUID(vendor_id),
                    customer_id=customer_id,
                    status="new",
                    delivery_method=delivery_method,
                    delivery_address_id=UUID(delivery_address_id) if delivery_address_id else None,
                    store_id=UUID(order_data["store_id"]) if order_data.get("store_id") else None,
                    subtotal=subtotal,
                    tax_amount=tax_amount,
                    shipping_amount=shipping_amount,
                    discount_amount=vendor_discount,
                    total_amount=total_amount,
                    gross_sales=subtotal_base,
                    commission_rate=commission_rate,
                    commission_amount=commission_amount,
                    net_payout=net_payout,
                    payment_status="paid" if (stripe_payment_intent_id or helcim_transaction_id) else "pending",
                    payment_method=payment_method,
                    helcim_transaction_id=helcim_transaction_id,
                    stripe_payment_intent_id=stripe_payment_intent_id
                )
                db.add(order)
                db.flush()

                for item_data in vendor_data["items"]:
                    product = item_data["product"]
                    quantity = item_data["quantity"]
                    customer_unit_price = product.price * vendor_markup_mult
                    order_item = OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        product_name=product.name,
                        product_price=product.price,
                        quantity=quantity,
                        subtotal=customer_unit_price * quantity
                    )
                    db.add(order_item)
                    product.stock_quantity -= quantity

                if coupon and vendor_discount > 0:
                    coupon_usage = CouponUsage(
                        coupon_id=coupon.id,
                        order_id=order.id,
                        customer_id=customer_id,
                        discount_amount=vendor_discount,
                        order_total=total_amount
                    )
                    db.add(coupon_usage)
                    coupon.usage_count += 1

                created_orders.append({
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "vendor_name": vendor.business_name,
                    "chef_name": None,
                    "total": float(total_amount)
                })

            for chef_id_str, chef_data in chef_orders.items():
                chef = chef_data["chef"]
                subtotal_base = sum(item["cuisine"].price * item["quantity"] for item in chef_data["items"])
                subtotal = subtotal_base * chef_markup_mult
                tax_amount = subtotal * Decimal("0.08")
                if delivery_method != "delivery":
                    shipping_amount = Decimal("0.00")
                elif order_data.get("shipping_amount") is not None:
                    try:
                        shipping_amount = Decimal(str(order_data["shipping_amount"]))
                    except Exception:
                        shipping_amount = _get_platform_delivery_fee(db)
                else:
                    shipping_amount = _get_platform_delivery_fee(db)
                total_amount = subtotal + tax_amount + shipping_amount
                order_number = f"EZF-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

                order = Order(
                    order_number=order_number,
                    vendor_id=None,
                    chef_id=UUID(chef_id_str),
                    store_id=None,
                    customer_id=customer_id,
                    status="new",
                    delivery_method=delivery_method,
                    delivery_address_id=UUID(delivery_address_id) if delivery_address_id else None,
                    subtotal=subtotal,
                    tax_amount=tax_amount,
                    shipping_amount=shipping_amount,
                    discount_amount=Decimal("0.00"),
                    total_amount=total_amount,
                    gross_sales=subtotal_base,
                    commission_rate=Decimal("0.00"),
                    commission_amount=Decimal("0.00"),
                    net_payout=subtotal_base,
                    payment_status="paid" if (stripe_payment_intent_id or helcim_transaction_id) else "pending",
                    payment_method=payment_method,
                    helcim_transaction_id=helcim_transaction_id,
                    stripe_payment_intent_id=stripe_payment_intent_id
                )
                db.add(order)
                db.flush()

                for item_data in chef_data["items"]:
                    cuisine = item_data["cuisine"]
                    qty = item_data["quantity"]
                    customer_unit = cuisine.price * chef_markup_mult
                    order_item = OrderItem(
                        order_id=order.id,
                        product_id=None,
                        cuisine_id=cuisine.id,
                        product_name=cuisine.name,
                        product_price=cuisine.price,
                        quantity=qty,
                        subtotal=customer_unit * qty
                    )
                    db.add(order_item)

                chef_display_name = chef.chef_name or f"{chef.first_name} {chef.last_name}"
                created_orders.append({
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "vendor_name": None,
                    "chef_name": chef_display_name,
                    "total": float(total_amount)
                })

        return {
            "message": "Orders created successfully",
            "orders": created_orders
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Failed to complete checkout for customer=%s order_data_keys=%s error=%s",
            current_customer["customer_id"] if current_customer else "guest",
            list(order_data.keys()) if isinstance(order_data, dict) else order_data,
            exc
        )
        raise HTTPException(status_code=500, detail="Unable to complete checkout at this time. Please try again.")

