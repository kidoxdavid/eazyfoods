"""
Identity dependencies (login-free mode).

Authentication has been removed for now. Every ``get_current_*`` dependency keeps its
original name and return shape so the ~345 endpoints that use them are unchanged, but
instead of decoding a JWT they resolve "who is acting" like this:

1. If the request carries an ``X-<Role>-Id`` header (X-Customer-Id, X-Vendor-Id,
   X-Chef-Id, X-Driver-Id, X-Admin-Id) with a valid UUID of an existing row, act as that row.
   A new X-Customer-Id is auto-provisioned as its own guest customer (one per browser/device).
2. Otherwise act as the default row for the role: the oldest active one. Customers and
   admins are auto-provisioned (a guest customer / a system admin) so a fresh database works.
   Vendors, chefs and drivers must exist already (seed them or sign them up via the
   partner-onboarding endpoints); otherwise the endpoint returns a clear 404.

SECURITY: with no authentication, anyone who can reach the API can act as any role.
Run it only locally or on a private network until auth is reintroduced.
"""
from typing import Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.admin import AdminUser
from app.models.chef import Chef
from app.models.customer import Customer
from app.models.driver import Driver
from app.models.vendor import VendorUser

GUEST_EMAIL = "guest@eazyfoods.local"
SYSTEM_ADMIN_EMAIL = "system@eazyfoods.local"


def _parse_uuid(value: Optional[str]) -> Optional[UUID]:
    if not value:
        return None
    try:
        return UUID(value.strip())
    except (ValueError, AttributeError):
        return None


def _missing(role: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No {role} exists yet. Create one first (login-free mode acts as the oldest active {role}).",
    )


# ── Customer ───────────────────────────────────────────────────────────────────

def _resolve_customer(db: Session, header_id: Optional[str]) -> Customer:
    customer_id = _parse_uuid(header_id)
    if customer_id:
        found = db.query(Customer).filter(Customer.id == customer_id).first()
        if found:
            return found
        # Each browser/device sends its own generated id, so give it its own guest customer
        # (private cart, orders, addresses) instead of sharing one global guest.
        device_guest = Customer(
            id=customer_id,
            email=f"guest-{customer_id}@eazyfoods.local",
            first_name="Guest",
            last_name="Shopper",
            is_email_verified=True,
        )
        db.add(device_guest)
        try:
            db.commit()
        except IntegrityError:  # a parallel request from the same device created it first
            db.rollback()
            return db.query(Customer).filter(Customer.id == customer_id).one()
        db.refresh(device_guest)
        return device_guest
    guest = db.query(Customer).filter(Customer.email == GUEST_EMAIL).first()
    if guest:
        return guest
    guest = Customer(email=GUEST_EMAIL, first_name="Guest", last_name="Shopper", is_email_verified=True)
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


async def get_current_customer(
    x_customer_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    customer = _resolve_customer(db, x_customer_id)
    return {"email": customer.email, "customer_id": str(customer.id)}


async def get_optional_customer(
    x_customer_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[dict]:
    return await get_current_customer(x_customer_id, db)


# ── Vendor ─────────────────────────────────────────────────────────────────────

def _resolve_vendor_user(db: Session, header_id: Optional[str]) -> Optional[VendorUser]:
    query = db.query(VendorUser).filter(VendorUser.is_active.is_(True))
    vendor_id = _parse_uuid(header_id)
    if vendor_id:
        scoped = query.filter(VendorUser.vendor_id == vendor_id).order_by(VendorUser.created_at).first()
        if scoped:
            return scoped
    return query.order_by(VendorUser.created_at).first()


async def get_current_vendor(
    x_vendor_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    user = _resolve_vendor_user(db, x_vendor_id)
    if user is None:
        raise _missing("vendor")
    return {
        "email": user.email,
        "vendor_id": str(user.vendor_id),
        "user_id": str(user.id),
        "role": user.role,
    }


async def get_optional_vendor(
    x_vendor_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[dict]:
    try:
        return await get_current_vendor(x_vendor_id, db)
    except HTTPException:
        return None


# ── Driver ─────────────────────────────────────────────────────────────────────

async def get_current_driver(
    x_driver_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    query = db.query(Driver).filter(Driver.is_active.is_(True))
    driver_id = _parse_uuid(x_driver_id)
    driver = query.filter(Driver.id == driver_id).first() if driver_id else None
    driver = driver or query.order_by(Driver.created_at).first()
    if driver is None:
        raise _missing("driver")
    return {"email": driver.email, "driver_id": str(driver.id)}


# ── Chef ───────────────────────────────────────────────────────────────────────

async def get_current_chef(
    x_chef_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    query = db.query(Chef).filter(Chef.is_active.is_(True))
    chef_id = _parse_uuid(x_chef_id)
    chef = query.filter(Chef.id == chef_id).first() if chef_id else None
    chef = chef or query.order_by(Chef.created_at).first()
    if chef is None:
        raise _missing("chef")
    return {"email": chef.email, "chef_id": str(chef.id)}


# ── Admin ──────────────────────────────────────────────────────────────────────

def _resolve_admin(db: Session, header_id: Optional[str]) -> AdminUser:
    admin_id = _parse_uuid(header_id)
    if admin_id:
        found = db.query(AdminUser).filter(AdminUser.id == admin_id, AdminUser.is_active.is_(True)).first()
        if found:
            return found
    admin = db.query(AdminUser).filter(AdminUser.is_active.is_(True)).order_by(AdminUser.created_at).first()
    if admin:
        return admin
    admin = AdminUser(
        email=SYSTEM_ADMIN_EMAIL,
        password_hash="!",  # unusable: nothing can log in with it
        first_name="System",
        last_name="Admin",
        role="super_admin",
        permissions={"all": True},
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


async def get_current_admin(
    x_admin_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    admin = _resolve_admin(db, x_admin_id)
    return {
        "email": admin.email,
        "admin_id": str(admin.id),
        "role": admin.role,
        "permissions": admin.permissions,
    }


async def get_optional_admin(
    x_admin_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[dict]:
    return await get_current_admin(x_admin_id, db)
