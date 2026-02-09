"""
Recipe and RecipeIngredient models
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, Numeric, CheckConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid
from app.core.database import Base


class Recipe(Base):
    __tablename__ = "recipes"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    image_url = Column(String(500))
    meal_type = Column(String(50), nullable=False)  # breakfast, lunch, dinner
    cuisine_type = Column(String(100))  # e.g., Nigerian, Ghanaian
    african_region = Column(String(100))  # e.g., West Africa, East Africa, Central Africa, North Africa, Southern Africa
    prep_time_minutes = Column(Integer)
    cook_time_minutes = Column(Integer)
    servings = Column(Integer, default=1)  # Base servings (1 person household)
    difficulty = Column(String(20))  # easy, medium, hard
    instructions = Column(Text)  # Step-by-step cooking instructions
    nutrition_info = Column(JSONB)  # Optional nutrition information
    is_active = Column(Boolean, default=True)
    created_at = Column(Text, server_default=func.now())
    updated_at = Column(Text, server_default=func.now(), onupdate=func.now())

    # Relationships
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("meal_type IN ('breakfast', 'lunch', 'dinner')", name="check_meal_type"),
        CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name="check_difficulty"),
    )


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)  # Base quantity for 1 person household
    unit = Column(String(50), nullable=False)  # kg, g, piece, cup, tbsp
    is_optional = Column(Boolean, default=False)
    notes = Column(String(255))  # e.g., "chopped", "diced", "optional"
    created_at = Column(Text, server_default=func.now())

    # Relationships
    recipe = relationship("Recipe", back_populates="ingredients")
    product = relationship("Product", lazy="select")

