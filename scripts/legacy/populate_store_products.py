#!/usr/bin/env python3
"""
Script to populate a store with random products for testing
"""
import sys
import os
import random
from decimal import Decimal
from datetime import datetime, timedelta

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import SessionLocal, engine
from uuid import UUID, uuid4
import re

# Sample product data for African grocery store
AFRICAN_PRODUCTS = [
    {"name": "Jollof Rice Mix", "price": 8.99, "unit": "pack", "category": "Grains & Rice"},
    {"name": "Palm Oil", "price": 12.99, "unit": "bottle", "category": "Oils & Condiments"},
    {"name": "Plantain Chips", "price": 5.99, "unit": "pack", "category": "Snacks"},
    {"name": "Fufu Flour", "price": 6.99, "unit": "kg", "category": "Grains & Rice"},
    {"name": "Garri (Cassava Flakes)", "price": 7.99, "unit": "kg", "category": "Grains & Rice"},
    {"name": "Egusi Seeds", "price": 15.99, "unit": "kg", "category": "Nuts & Seeds"},
    {"name": "Bitter Leaf", "price": 4.99, "unit": "bunch", "category": "Vegetables"},
    {"name": "Yam", "price": 3.99, "unit": "kg", "category": "Vegetables"},
    {"name": "Cocoyam", "price": 4.49, "unit": "kg", "category": "Vegetables"},
    {"name": "Okra", "price": 5.99, "unit": "kg", "category": "Vegetables"},
    {"name": "Scotch Bonnet Peppers", "price": 6.99, "unit": "kg", "category": "Vegetables"},
    {"name": "African Eggplant", "price": 4.99, "unit": "kg", "category": "Vegetables"},
    {"name": "Bitter Kola", "price": 9.99, "unit": "kg", "category": "Nuts & Seeds"},
    {"name": "Kola Nuts", "price": 12.99, "unit": "kg", "category": "Nuts & Seeds"},
    {"name": "Groundnut (Peanuts)", "price": 8.99, "unit": "kg", "category": "Nuts & Seeds"},
    {"name": "Black-eyed Peas", "price": 5.99, "unit": "kg", "category": "Beans & Legumes"},
    {"name": "Honey Beans", "price": 6.49, "unit": "kg", "category": "Beans & Legumes"},
    {"name": "Brown Beans", "price": 5.49, "unit": "kg", "category": "Beans & Legumes"},
    {"name": "Red Beans", "price": 5.99, "unit": "kg", "category": "Beans & Legumes"},
    {"name": "Coconut Oil", "price": 11.99, "unit": "bottle", "category": "Oils & Condiments"},
    {"name": "Groundnut Oil", "price": 9.99, "unit": "bottle", "category": "Oils & Condiments"},
    {"name": "Maggi Cubes", "price": 3.99, "unit": "pack", "category": "Seasonings"},
    {"name": "Knorr Cubes", "price": 3.49, "unit": "pack", "category": "Seasonings"},
    {"name": "Curry Powder", "price": 4.99, "unit": "pack", "category": "Seasonings"},
    {"name": "Thyme", "price": 3.99, "unit": "pack", "category": "Seasonings"},
    {"name": "Bay Leaves", "price": 2.99, "unit": "pack", "category": "Seasonings"},
    {"name": "Dried Fish", "price": 14.99, "unit": "kg", "category": "Seafood"},
    {"name": "Smoked Fish", "price": 16.99, "unit": "kg", "category": "Seafood"},
    {"name": "Stockfish", "price": 18.99, "unit": "kg", "category": "Seafood"},
    {"name": "Crayfish", "price": 19.99, "unit": "kg", "category": "Seafood"},
    {"name": "Goat Meat", "price": 24.99, "unit": "kg", "category": "Meat"},
    {"name": "Beef", "price": 22.99, "unit": "kg", "category": "Meat"},
    {"name": "Chicken", "price": 18.99, "unit": "kg", "category": "Meat"},
    {"name": "Turkey", "price": 26.99, "unit": "kg", "category": "Meat"},
    {"name": "Suya Spice Mix", "price": 7.99, "unit": "pack", "category": "Seasonings"},
    {"name": "Pepper Soup Spice", "price": 6.99, "unit": "pack", "category": "Seasonings"},
    {"name": "Banga Spice", "price": 5.99, "unit": "pack", "category": "Seasonings"},
    {"name": "African Bread", "price": 4.99, "unit": "loaf", "category": "Bakery"},
    {"name": "Agege Bread", "price": 3.99, "unit": "loaf", "category": "Bakery"},
    {"name": "Puff Puff Mix", "price": 5.99, "unit": "pack", "category": "Bakery"},
    {"name": "Chin Chin", "price": 6.99, "unit": "pack", "category": "Snacks"},
    {"name": "Buns", "price": 4.49, "unit": "pack", "category": "Bakery"},
    {"name": "Maltina", "price": 3.99, "unit": "bottle", "category": "Beverages"},
    {"name": "Chapman", "price": 4.99, "unit": "bottle", "category": "Beverages"},
    {"name": "Zobo Drink", "price": 5.99, "unit": "bottle", "category": "Beverages"},
    {"name": "Tiger Nuts", "price": 8.99, "unit": "kg", "category": "Nuts & Seeds"},
    {"name": "Cashew Nuts", "price": 15.99, "unit": "kg", "category": "Nuts & Seeds"},
    {"name": "Almonds", "price": 18.99, "unit": "kg", "category": "Nuts & Seeds"},
    {"name": "Dried Mango", "price": 9.99, "unit": "kg", "category": "Fruits"},
    {"name": "Dried Pineapple", "price": 8.99, "unit": "kg", "category": "Fruits"},
    {"name": "Fresh Mango", "price": 4.99, "unit": "kg", "category": "Fruits"},
    {"name": "Fresh Pineapple", "price": 3.99, "unit": "piece", "category": "Fruits"},
    {"name": "Papaya", "price": 4.49, "unit": "kg", "category": "Fruits"},
    {"name": "Watermelon", "price": 5.99, "unit": "piece", "category": "Fruits"},
]

def generate_slug(name):
    """Generate a URL-friendly slug from product name"""
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return slug

def get_or_create_category(db: Session, category_name: str):
    """Get or create a category using raw SQL"""
    slug = generate_slug(category_name)
    
    # Check if category exists
    result = db.execute(text("""
        SELECT id FROM categories WHERE name = :name LIMIT 1
    """), {"name": category_name})
    row = result.fetchone()
    
    if row:
        return row[0]  # Return category ID
    
    # Create new category
    category_id = uuid4()
    db.execute(text("""
        INSERT INTO categories (id, name, slug, is_active, created_at, updated_at)
        VALUES (:id, :name, :slug, :is_active, NOW(), NOW())
    """), {
        "id": category_id,
        "name": category_name,
        "slug": slug,
        "is_active": True
    })
    db.commit()
    return category_id

def create_product(db: Session, product_data: dict, vendor_id: UUID, store_id: UUID = None, category_id: UUID = None):
    """Create a product in the database using raw SQL"""
    slug = generate_slug(product_data["name"])
    
    # Ensure slug is unique
    result = db.execute(text("""
        SELECT id FROM products WHERE slug = :slug LIMIT 1
    """), {"slug": slug})
    if result.fetchone():
        slug = f"{slug}-{int(datetime.now().timestamp())}"
    
    # Randomly decide if product should have sale price
    has_sale = random.choice([True, False, False])  # 33% chance of being on sale
    sale_price = None
    compare_at_price = None
    
    if has_sale:
        discount = random.choice([0.10, 0.15, 0.20, 0.25])  # 10-25% discount
        compare_at_price = float(product_data["price"])
        sale_price = float(product_data["price"]) * (1 - discount)
    
    # Random stock quantity
    stock_quantity = random.randint(0, 100)
    
    # Random features
    is_featured = random.choice([True, False, False, False])  # 25% chance
    is_newly_stocked = random.choice([True, False, False])  # 33% chance
    
    product_id = uuid4()
    
    db.execute(text("""
        INSERT INTO products (
            id, vendor_id, store_id, name, description, price, sale_price, compare_at_price,
            category_id, unit, stock_quantity, low_stock_threshold, status, is_featured,
            is_newly_stocked, slug, track_inventory, created_at, updated_at
        ) VALUES (
            :id, :vendor_id, :store_id, :name, :description, :price, :sale_price, :compare_at_price,
            :category_id, :unit, :stock_quantity, :low_stock_threshold, :status, :is_featured,
            :is_newly_stocked, :slug, :track_inventory, NOW(), NOW()
        )
    """), {
        "id": product_id,
        "vendor_id": vendor_id,
        "store_id": store_id,
        "name": product_data["name"],
        "description": f"Fresh {product_data['name'].lower()} - Premium quality African grocery item.",
        "price": float(product_data["price"]),
        "sale_price": sale_price,
        "compare_at_price": compare_at_price,
        "category_id": category_id,
        "unit": product_data["unit"],
        "stock_quantity": stock_quantity,
        "low_stock_threshold": 10,
        "status": "active",
        "is_featured": is_featured,
        "is_newly_stocked": is_newly_stocked,
        "slug": slug,
        "track_inventory": True
    })
    
    return {"id": product_id, "name": product_data["name"], "price": product_data["price"]}

def main():
    db = SessionLocal()
    
    try:
        # Get the most recently created store using raw SQL to avoid relationship issues
        result = db.execute(text("""
            SELECT id, vendor_id, name, created_at 
            FROM stores 
            ORDER BY created_at DESC 
            LIMIT 1
        """))
        store_row = result.fetchone()
        
        if not store_row:
            print("No stores found in the database. Please create a store first.")
            return
        
        store_id = store_row[0]  # Already a UUID from database
        vendor_id = store_row[1]  # Already a UUID from database
        store_name = store_row[2]
        
        # Get vendor name
        vendor_result = db.execute(text("""
            SELECT business_name 
            FROM vendors 
            WHERE id = :vendor_id
        """), {"vendor_id": vendor_id})
        vendor_row = vendor_result.fetchone()
        vendor_name = vendor_row[0] if vendor_row else "Unknown"
        
        print(f"Found store: {store_name}")
        print(f"Vendor: {vendor_name}")
        print(f"Store ID: {store_id}")
        print(f"Vendor ID: {vendor_id}")
        print("\nCreating products...")
        
        # Create categories and products
        created_count = 0
        for product_data in AFRICAN_PRODUCTS:
            try:
                # Get or create category
                category_id = get_or_create_category(db, product_data["category"])
                
                # Create product
                product = create_product(
                    db=db,
                    product_data=product_data,
                    vendor_id=vendor_id,
                    store_id=store_id,
                    category_id=category_id
                )
                
                created_count += 1
                print(f"  ✓ Created: {product['name']} - ${product['price']} ({product_data['unit']})")
                
            except Exception as e:
                print(f"  ✗ Error creating {product_data['name']}: {e}")
                db.rollback()
                continue
        
        db.commit()
        print(f"\n✅ Successfully created {created_count} products for store: {store_name}")
        print(f"   Store ID: {store_id}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

