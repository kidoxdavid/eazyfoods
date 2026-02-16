"""
Admin category management - add categories that show up in vendor product form
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.core.database import get_db
from app.models.product import Category
from app.api.v1.dependencies import get_current_admin
import re

router = APIRouter()


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    slug: str | None = None
    image_url: str | None = None  # emoji or icon id for category icon


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None
    is_active: bool


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_categories(
    include_inactive: bool = False,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all categories for admin management"""
    query = db.query(Category).order_by(Category.name)
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    categories = query.all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug or "",
            "description": c.description or "",
            "image_url": c.image_url,
            "is_active": c.is_active,
        }
        for c in categories
    ]


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new category. Vendors will see it when adding products."""
    # Generate slug from name if not provided
    slug = data.slug
    if not slug or not slug.strip():
        slug = re.sub(r"[^a-z0-9]+", "-", data.name.lower()).strip("-")
        if not slug:
            raise HTTPException(status_code=400, detail="Could not generate slug from name")

    # Ensure slug is unique
    existing = db.query(Category).filter(Category.slug == slug).first()
    if existing:
        import time
        slug = f"{slug}-{int(time.time())}"

    category = Category(
        name=data.name,
        slug=slug,
        description=data.description or None,
        image_url=data.image_url or None,
        is_active=True,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return {
        "id": str(category.id),
        "name": category.name,
        "slug": category.slug,
        "description": category.description or "",
        "image_url": category.image_url,
        "is_active": category.is_active,
    }
