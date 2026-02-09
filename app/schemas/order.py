"""
Order schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from decimal import Decimal
from datetime import datetime


class OrderItemResponse(BaseModel):
    id: str
    product_id: Optional[str]
    product_name: str
    product_price: Decimal
    quantity: int
    subtotal: Decimal
    is_substituted: bool
    is_out_of_stock: bool
    quantity_fulfilled: int
    
    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: str
    order_number: str
    order_id: Optional[str] = None
    customer_id: Optional[str]
    status: str
    delivery_method: str
    subtotal: Decimal
    tax_amount: Decimal
    shipping_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    gross_sales: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    net_payout: Decimal
    payment_status: str
    payment_method: Optional[str] = None
    special_instructions: Optional[str]
    customer_notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    delivery: Optional[Any] = None
    items: List[OrderItemResponse] = []
    
    class Config:
        from_attributes = True


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    special_instructions: Optional[str] = None
    
    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    id: str
    order_number: str
    status: str
    total_amount: Decimal
    payment_status: str
    created_at: datetime
    delivery_method: Optional[str] = None
    delivery_status: Optional[str] = None  # For delivery orders after ready: awaiting_driver, accepted, picked_up, in_transit, delivered

    class Config:
        from_attributes = True

