"""
Admin category management - add categories that show up in vendor product form
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
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


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    slug: str | None = None
    image_url: str | None = None
    is_active: bool | None = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None
    is_active: bool


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_categories(
    include_inactive: bool = True,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all categories for admin management. Defaults to including inactive so admin always sees full list."""
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


@router.put("/{category_id}", response_model=dict)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a category."""
    try:
        cat_uuid = UUID(category_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID format")

    category = db.query(Category).filter(Category.id == cat_uuid).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if data.name is not None:
        category.name = data.name
    if data.description is not None:
        category.description = data.description or None
    if data.image_url is not None:
        category.image_url = data.image_url or None
    if data.is_active is not None:
        category.is_active = data.is_active
    if data.slug is not None and data.slug.strip():
        slug = data.slug.strip()
        existing = db.query(Category).filter(Category.slug == slug, Category.id != cat_uuid).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already in use")
        category.slug = slug
    elif data.name is not None and not (data.slug and data.slug.strip()):
        slug = re.sub(r"[^a-z0-9]+", "-", data.name.lower()).strip("-")
        if slug:
            existing = db.query(Category).filter(Category.slug == slug, Category.id != cat_uuid).first()
            if not existing:
                category.slug = slug

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


@router.delete("/{category_id}", response_model=dict)
async def delete_category(
    category_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a category. Fails if any products use this category."""
    from app.models.product import Product

    try:
        cat_uuid = UUID(category_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID format")

    category = db.query(Category).filter(Category.id == cat_uuid).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    product_count = db.query(Product).filter(
        (Product.category_id == cat_uuid) | (Product.subcategory_id == cat_uuid)
    ).count()
    if product_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category: {product_count} product(s) use this category. Reassign or remove those products first."
        )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}
