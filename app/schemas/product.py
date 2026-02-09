"""
Product schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    sale_price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    vendor_sku: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    unit: str = "piece"
    weight_kg: Optional[Decimal] = None
    stock_quantity: int = 0
    low_stock_threshold: int = 10
    track_inventory: bool = True
    expiry_date: Optional[date] = None
    track_expiry: bool = False
    status: str = "active"
    is_featured: bool = False
    is_newly_stocked: bool = False
    slug: str
    origin_country: Optional[str] = None
    store_id: Optional[str] = None  # Added store_id to ProductCreate
    
    class Config:
        from_attributes = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    unit: Optional[str] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    expiry_date: Optional[date] = None
    track_expiry: Optional[bool] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    is_newly_stocked: Optional[bool] = None
    store_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: str
    vendor_id: str
    name: str
    description: Optional[str]
    price: Decimal
    sale_price: Optional[Decimal]
    compare_at_price: Optional[Decimal]
    category_id: Optional[str]
    sku: Optional[str]
    barcode: Optional[str]
    image_url: Optional[str]
    images: Optional[List[str]]
    unit: str
    stock_quantity: int
    low_stock_threshold: int
    expiry_date: Optional[date] = None
    track_expiry: Optional[bool] = False
    status: str
    is_featured: bool
    is_newly_stocked: bool
    slug: str
    
    class Config:
        from_attributes = True

