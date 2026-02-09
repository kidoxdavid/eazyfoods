"""
Pydantic schemas for recipes
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class RecipeIngredientBase(BaseModel):
    product_id: str
    quantity: float
    unit: str
    is_optional: bool = False
    notes: Optional[str] = None


class RecipeIngredientCreate(RecipeIngredientBase):
    pass


class RecipeIngredientResponse(RecipeIngredientBase):
    id: str
    product: Optional[dict] = None  # Product details
    
    class Config:
        from_attributes = True


class RecipeBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    meal_type: Optional[str] = Field(None, pattern="^(breakfast|lunch|dinner)$")
    cuisine_type: Optional[str] = None
    african_region: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: int = 1  # Base servings (1 person household)
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")
    instructions: Optional[str] = None
    nutrition_info: Optional[dict] = None


class RecipeCreate(RecipeBase):
    ingredients: List[RecipeIngredientCreate] = []


class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    meal_type: Optional[str] = Field(None, pattern="^(breakfast|lunch|dinner)$")
    cuisine_type: Optional[str] = None
    african_region: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")
    instructions: Optional[str] = None
    nutrition_info: Optional[dict] = None
    is_active: Optional[bool] = None


class RecipeResponse(RecipeBase):
    id: str
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    ingredients: List[RecipeIngredientResponse] = []
    
    class Config:
        from_attributes = True


class RecipeListResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    meal_type: str
    cuisine_type: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: int
    difficulty: Optional[str] = None
    
    class Config:
        from_attributes = True

