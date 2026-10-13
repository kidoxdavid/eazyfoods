"""The API runs without any authentication: identity is resolved, not proven."""
import uuid


def test_health(client):
    assert client.get("/health").json() == {"status": "healthy"}


def test_login_routes_are_gone(client):
    for path in ("/api/v1/customer/auth/login", "/api/v1/admin/auth/login", "/api/v1/chef/auth/login",
                 "/api/v1/driver/auth/login", "/api/v1/auth/login", "/api/v1/customer/auth/google"):
        assert client.post(path, json={}).status_code in (404, 405), path


def test_protected_endpoints_open_without_token(client):
    assert client.get("/api/v1/customer/orders").status_code == 200
    assert client.get("/api/v1/admin/dashboard/stats").status_code == 200


def test_missing_partner_gives_clear_404(client):
    res = client.get("/api/v1/chef/auth/me")
    assert res.status_code == 404
    assert "No chef exists" in res.json()["detail"]


def test_each_device_gets_its_own_guest_customer(client, device_id):
    other = str(uuid.uuid4())
    a = client.get("/api/v1/customer/cart", headers={"X-Customer-Id": device_id})
    b = client.get("/api/v1/customer/cart", headers={"X-Customer-Id": other})
    assert a.status_code == b.status_code == 200

    item = [{"id": "p1", "name": "Palm Oil", "quantity": 2}]
    assert client.post("/api/v1/customer/cart/sync", json={"cart": item}, headers={"X-Customer-Id": device_id}).json() == {"ok": True}

    assert client.get("/api/v1/customer/cart", headers={"X-Customer-Id": device_id}).json()["cart"] == item
    assert client.get("/api/v1/customer/cart", headers={"X-Customer-Id": other}).json()["cart"] == []


def test_cart_clear(client, device_id):
    h = {"X-Customer-Id": device_id}
    client.post("/api/v1/customer/cart/sync", json={"cart": [{"id": "x"}]}, headers=h)
    assert client.delete("/api/v1/customer/cart", headers=h).json() == {"ok": True}
    assert client.get("/api/v1/customer/cart", headers=h).json()["cart"] == []


def test_invalid_device_id_falls_back_to_shared_guest(client):
    res = client.get("/api/v1/customer/cart", headers={"X-Customer-Id": "not-a-uuid"})
    assert res.status_code == 200


def test_semantic_search_degrades_without_ai_key(client):
    res = client.post("/api/v1/ai/search", json={"query": "cheap egusi"})
    assert res.status_code == 200
    assert res.json()["search_term"]


def test_cart_works_when_table_is_missing_at_startup():
    """Databases adopted via `alembic stamp head` may lack customer_carts; startup must create it."""
    from fastapi.testclient import TestClient
    from sqlalchemy import text
    from app.core.database import engine
    from app.main import app

    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS customer_carts"))
    with TestClient(app) as fresh:  # entering the context runs startup handlers
        res = fresh.get("/api/v1/customer/cart", headers={"X-Customer-Id": str(uuid.uuid4())})
        assert res.status_code == 200 and res.json() == {"cart": []}
