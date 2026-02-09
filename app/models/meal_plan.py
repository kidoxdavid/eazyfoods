"""
Meal Plan models for marketing and customer portals
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DECIMAL, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class MealPlan(Base):
    __tablename__ = "meal_plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    plan_type = Column(String(20), nullable=False)  # one_day, one_week, one_month
    image_url = Column(String(500))
    
    # Status
    status = Column(String(20), default="draft")  # draft, active, inactive
    is_live = Column(Boolean, default=False)  # Whether it's live on customer side
    
    # Pricing (optional)
    price = Column(DECIMAL(10, 2))  # Optional pricing for meal plan
    
    # Store association: store_id from customer_stores (Store.id or Vendor.id for vendors without stores)
    store_id = Column(UUID(as_uuid=True), nullable=True)  # Links to Store or Vendor for checkout display
    
    # Created by
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    meals = relationship("MealPlanMeal", back_populates="meal_plan", cascade="all, delete-orphan")


class MealPlanMeal(Base):
    __tablename__ = "meal_plan_meals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_plan_id = Column(UUID(as_uuid=True), ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    meal_type = Column(String(20), nullable=False)  # breakfast, lunch, dinner
    day_number = Column(Integer)  # For weekly/monthly plans: 1-7 for week, 1-30 for month
    order = Column(Integer, default=0)  # Order within the meal plan
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    meal_plan = relationship("MealPlan", back_populates="meals")
    recipe = relationship("Recipe", lazy="select")

