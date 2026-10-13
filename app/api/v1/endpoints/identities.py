"""
Who can a portal act as? (login-free mode)

With authentication removed, each partner portal needs a way to choose which vendor, chef or driver it is
acting as; the choice is sent back as the matching ``X-<Role>-Id`` header (see dependencies.py).
Only minimal, non-sensitive fields are returned.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.chef import Chef
from app.models.driver import Driver
from app.models.vendor import Vendor, VendorUser

router = APIRouter()


@router.get("/{role}", response_model=List[dict])
async def list_identities(role: str, db: Session = Depends(get_db)):
    """List the accounts a portal can act as: role is one of vendor, chef, driver."""
    if role == "vendor":
        rows = (
            db.query(Vendor)
            .filter(db.query(VendorUser.id).filter(VendorUser.vendor_id == Vendor.id, VendorUser.is_active.is_(True)).exists())
            .order_by(Vendor.created_at)
            .limit(200)
            .all()
        )
        return [{"id": str(v.id), "name": v.business_name, "email": v.email, "status": v.status} for v in rows]
    if role == "chef":
        rows = db.query(Chef).filter(Chef.is_active.is_(True)).order_by(Chef.created_at).limit(200).all()
        return [{"id": str(c.id), "name": c.chef_name or f"{c.first_name} {c.last_name}", "email": c.email,
                 "status": c.verification_status} for c in rows]
    if role == "driver":
        rows = db.query(Driver).filter(Driver.is_active.is_(True)).order_by(Driver.created_at).limit(200).all()
        return [{"id": str(d.id), "name": f"{d.first_name} {d.last_name}", "email": d.email,
                 "status": d.verification_status} for d in rows]
    raise HTTPException(status_code=404, detail="Unknown role")
