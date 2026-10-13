"""Partner onboarding (the only signups that remain) and the identity each portal then acts as."""
import uuid


def _tag() -> str:
    return uuid.uuid4().hex[:8]


def vendor_payload(tag):
    return {"business_name": f"Market {tag}", "email": f"vendor-{tag}@example.com", "password": "Passw0rd!", "phone": "4165550111",
            "first_name": "Vee", "last_name": "Ndu", "street_address": "9 Spice Rd", "city": "Toronto", "state": "Ontario",
            "postal_code": "M5V 2T6", "business_type": "grocery"}


def test_vendor_signup_then_portal_acts_as_that_vendor(client):
    tag = _tag()
    res = client.post("/api/v1/auth/signup", json=vendor_payload(tag))
    assert res.status_code == 201, res.text

    # the vendor portal resolves an identity without any token
    me = client.get("/api/v1/vendors/me")
    assert me.status_code == 200
    assert me.json()["email"]


def test_vendor_duplicate_email_rejected(client):
    tag = _tag()
    assert client.post("/api/v1/auth/signup", json=vendor_payload(tag)).status_code == 201
    dup = client.post("/api/v1/auth/signup", json=vendor_payload(tag))
    assert dup.status_code == 400
    assert "already" in dup.json()["detail"].lower()


def test_vendor_header_selects_which_vendor_the_portal_acts_as(client):
    first, second = _tag(), _tag()
    client.post("/api/v1/auth/signup", json=vendor_payload(first))
    client.post("/api/v1/auth/signup", json=vendor_payload(second))
    from app.core.database import SessionLocal
    from app.models.vendor import Vendor
    db = SessionLocal()
    try:
        target = db.query(Vendor).filter(Vendor.email == f"vendor-{second}@example.com").one()
        target_id = str(target.id)
    finally:
        db.close()
    me = client.get("/api/v1/vendors/me", headers={"X-Vendor-Id": target_id})
    assert me.status_code == 200
    assert me.json()["email"] == f"vendor-{second}@example.com"


def test_chef_signup_and_me(client):
    tag = _tag()
    body = {"email": f"chef-{tag}@example.com", "password": "Passw0rd!", "phone": "4165550122", "first_name": "Ada", "last_name": "Eze",
            "chef_name": f"Chef {tag}", "street_address": "5 Pot St", "city": "Toronto", "postal_code": "M5C 1E9",
            "cuisines": ["Nigerian"]}
    res = client.post("/api/v1/chef/auth/signup", json=body)
    assert res.status_code == 201, res.text
    assert res.json()


def test_driver_signup_requires_core_fields(client):
    tag = _tag()
    ok = {"email": f"drv-{tag}@example.com", "password": "Passw0rd!", "first_name": "Dee", "last_name": "Ray", "phone": "4165550133",
          "street_address": "7 Wheel Ave", "city": "Toronto", "postal_code": "M4B 1B3"}
    res = client.post("/api/v1/driver/auth/signup", json=ok)
    assert res.status_code in (200, 201), res.text
    bad = dict(ok, email=f"drv2-{tag}@example.com", phone="")
    assert client.post("/api/v1/driver/auth/signup", json=bad).status_code == 400


def test_pending_driver_cannot_be_acted_as_until_approved(client):
    """Drivers stay inactive until an admin approves them, so the driver portal has no one to act as yet."""
    from app.core.database import SessionLocal
    from app.models.driver import Driver
    db = SessionLocal()
    try:
        db.query(Driver).update({Driver.is_active: False})
        db.commit()
    finally:
        db.close()
    res = client.get("/api/v1/driver/me")
    assert res.status_code == 404
    assert "No driver exists" in res.json()["detail"]


def test_identities_lists_accounts_a_portal_can_act_as(client):
    tag = _tag()
    client.post("/api/v1/auth/signup", json=vendor_payload(tag))
    rows = client.get("/api/v1/identities/vendor").json()
    assert any(r["email"] == f"vendor-{tag}@example.com" for r in rows)
    assert set(rows[0]) == {"id", "name", "email", "status"}
    assert client.get("/api/v1/identities/chef").status_code == 200
    assert client.get("/api/v1/identities/driver").status_code == 200
    assert client.get("/api/v1/identities/admin").status_code == 404
