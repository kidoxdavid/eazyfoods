"""
Cuisine schemas for chefs
"""
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal


class CuisineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    cuisine_type: Optional[str] = None
    price: Decimal
    price_per_person: Optional[Decimal] = None
    minimum_servings: int = 1
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    ingredients: Optional[List[str]] = None
    allergens: Optional[List[str]] = None
    spice_level: str = "medium"  # mild, medium, hot, very_hot
    prep_time_minutes: Optional[int] = None
    serves: int = 1
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_gluten_free: bool = False
    is_halal: bool = False
    is_kosher: bool = False
    status: str = "active"
    is_featured: bool = False
    slug: str
    
    class Config:
        from_attributes = True


class CuisineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cuisine_type: Optional[str] = None
    price: Optional[Decimal] = None
    price_per_person: Optional[Decimal] = None
    minimum_servings: Optional[int] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    ingredients: Optional[List[str]] = None
    allergens: Optional[List[str]] = None
    spice_level: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    serves: Optional[int] = None
    is_vegetarian: Optional[bool] = None
    is_vegan: Optional[bool] = None
    is_gluten_free: Optional[bool] = None
    is_halal: Optional[bool] = None
    is_kosher: Optional[bool] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    
    class Config:
        from_attributes = True


class CuisineResponse(BaseModel):
    id: str
    chef_id: str
    name: str
    description: Optional[str]
    cuisine_type: Optional[str]
    price: Decimal
    price_per_person: Optional[Decimal]
    minimum_servings: int
    image_url: Optional[str]
    images: Optional[List[str]]
    ingredients: Optional[List[str]]
    allergens: Optional[List[str]]
    spice_level: str
    prep_time_minutes: Optional[int]
    serves: int
    is_vegetarian: bool
    is_vegan: bool
    is_gluten_free: bool
    is_halal: bool
    is_kosher: bool
    status: str
    is_featured: bool
    slug: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True

