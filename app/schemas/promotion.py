"""
Promotion schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from decimal import Decimal
from datetime import datetime


class PromotionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    promotion_type: str  # discount, store_wide_sale, featured, bundle
    discount_type: Optional[str] = None  # percentage, fixed_amount
    discount_value: Optional[Decimal] = None
    minimum_order_amount: Optional[Decimal] = None
    applies_to_all_products: bool = False
    product_ids: Optional[List[str]] = None
    requires_approval: bool = False
    start_date: datetime
    end_date: datetime
    
    class Config:
        from_attributes = True


class PromotionUpdate(BaseModel):
    """Fields that can be updated on a promotion."""
    name: Optional[str] = None
    description: Optional[str] = None
    promotion_type: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[Decimal] = None
    minimum_order_amount: Optional[Decimal] = None
    applies_to_all_products: Optional[bool] = None
    product_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PromotionResponse(BaseModel):
    """Response shape returned to the frontend."""
    id: str
    name: str
    description: Optional[str]
    promotion_type: str
    discount_type: Optional[str]
    discount_value: Optional[Decimal]
    applies_to_all_products: bool
    # IDs of products this promotion targets (if not applies_to_all_products)
    product_ids: Optional[List[str]] = None
    # Optional lightweight list of affected products (used in vendor UI)
    affected_products: Optional[List[Any]] = None
    status: str  # active/inactive based on dates and is_active
    approval_status: str
    start_date: datetime
    end_date: datetime
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

