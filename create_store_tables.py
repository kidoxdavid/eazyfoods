"""
Create store tables in the database
"""
from app.core.database import engine, Base
# Import all models to ensure foreign key relationships are resolved
from app.models.store import Store
from app.models.vendor import Vendor
from app.models.product import Product
from app.models.order import Order
from app.models.inventory import InventoryAdjustment

if __name__ == "__main__":
    print("Creating store tables...")
    # Create store table
    Base.metadata.create_all(bind=engine, tables=[Store.__table__])
    
    # Add store_id columns to existing tables (if they don't exist)
    # Note: This will only create the column if the table exists but column doesn't
    # For production, you'd want to use proper migrations
    print("Store tables created successfully!")
    print("Note: You may need to manually add store_id columns to existing tables using migrations")

