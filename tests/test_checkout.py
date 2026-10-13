"""Guest checkout: contact details become the device customer's profile; orders stay private to the device."""
import uuid
from decimal import Decimal

import pytest

CONTACT = {
    "guest_first_name": "Ada", "guest_last_name": "Obi", "guest_email": "ada@example.com", "guest_phone": "416-555-0100",
}


@pytest.fixture(scope="module")
def product_id(client):
    from app.core.database import SessionLocal
    from app.models.product import Product
    from app.models.store import Store
    from app.models.vendor import Vendor

    db = SessionLocal()
    try:
        vendor = Vendor(business_name="Test Market", business_type="grocery", email=f"v-{uuid.uuid4().hex[:8]}@test.local",
                        phone="4165550000", street_address="1 Main St", city="Toronto", postal_code="M5H 1A1", status="active")
        db.add(vendor)
        db.flush()
        store = Store(vendor_id=vendor.id, name="Main", street_address="1 Main St", city="Toronto", postal_code="M5H 1A1")
        db.add(store)
        db.flush()
        product = Product(vendor_id=vendor.id, store_id=store.id, name="Palm Oil 1L", slug=f"palm-{uuid.uuid4().hex[:8]}",
                          price=Decimal("10.00"), stock_quantity=20, status="active")
        db.add(product)
        db.commit()
        return str(product.id)
    finally:
        db.close()


def order_body(product_id, **extra):
    return {"items": [{"product_id": product_id, "quantity": 2}], "delivery_method": "pickup", "payment_method": "cash", **extra}


def test_checkout_requires_contact_details(client, product_id):
    res = client.post("/api/v1/customer/cart/checkout", json=order_body(product_id), headers={"X-Customer-Id": str(uuid.uuid4())})
    assert res.status_code == 400
    assert "phone" in res.json()["detail"].lower()


def test_checkout_saves_contact_and_creates_order(client, product_id):
    device = {"X-Customer-Id": str(uuid.uuid4())}
    res = client.post("/api/v1/customer/cart/checkout", json=order_body(product_id, **CONTACT), headers=device)
    assert res.status_code == 201, res.text
    order = res.json()["orders"][0]
    assert order["order_number"]

    me = client.get("/api/v1/customer/me", headers=device).json()
    assert (me["first_name"], me["last_name"], me["phone"]) == ("Ada", "Obi", "416-555-0100")

    mine = client.get("/api/v1/customer/orders", headers=device).json()
    assert len(mine) == 1


def test_orders_are_private_per_device(client, product_id):
    a, b = {"X-Customer-Id": str(uuid.uuid4())}, {"X-Customer-Id": str(uuid.uuid4())}
    contact_b = {**CONTACT, "guest_email": "b@example.com"}
    assert client.post("/api/v1/customer/cart/checkout", json=order_body(product_id, **CONTACT), headers=a).status_code == 201
    assert client.get("/api/v1/customer/orders", headers=b).json() == []
    assert client.post("/api/v1/customer/cart/checkout", json=order_body(product_id, **contact_b), headers=b).status_code == 201


def test_repeat_order_reuses_saved_contact(client, product_id):
    device = {"X-Customer-Id": str(uuid.uuid4())}
    assert client.post("/api/v1/customer/cart/checkout", json=order_body(product_id, **CONTACT), headers=device).status_code == 201
    # second order without re-sending contact details still works
    assert client.post("/api/v1/customer/cart/checkout", json=order_body(product_id), headers=device).status_code == 201


def test_delivery_needs_an_address(client, product_id):
    body = order_body(product_id, **CONTACT)
    body["delivery_method"] = "delivery"
    res = client.post("/api/v1/customer/cart/checkout", json=body, headers={"X-Customer-Id": str(uuid.uuid4())})
    assert res.status_code == 400
    assert "address" in res.json()["detail"].lower()


def test_empty_cart_rejected(client):
    res = client.post("/api/v1/customer/cart/checkout", json={"items": [], **CONTACT}, headers={"X-Customer-Id": str(uuid.uuid4())})
    assert res.status_code == 400


def test_same_email_on_two_devices_is_allowed(client, product_id):
    """A shopper using their phone and laptop: the second device keeps its placeholder email but can still order."""
    one, two = {"X-Customer-Id": str(uuid.uuid4())}, {"X-Customer-Id": str(uuid.uuid4())}
    shared = {**CONTACT, "guest_email": "shared@example.com"}
    assert client.post("/api/v1/customer/cart/checkout", json=order_body(product_id, **shared), headers=one).status_code == 201
    assert client.post("/api/v1/customer/cart/checkout", json=order_body(product_id, **shared), headers=two).status_code == 201
    assert client.post("/api/v1/customer/cart/checkout", json=order_body(product_id), headers=two).status_code == 201
