"""
Add more sample products to the vendor
"""
import psycopg2
import os
from dotenv import load_dotenv
from decimal import Decimal
from datetime import datetime
import uuid

load_dotenv()

# Read .env manually
env_vars = {}
with open('.env', 'r') as f:
    for line in f:
        if '=' in line and not line.strip().startswith('#'):
            key, value = line.strip().split('=', 1)
            env_vars[key] = value

conn = psycopg2.connect(
    host=env_vars.get('DB_HOST', 'localhost'),
    port=env_vars.get('DB_PORT', '5432'),
    user=env_vars.get('DB_USER', 'postgres'),
    password=env_vars.get('DB_PASSWORD', ''),
    database=env_vars.get('DB_NAME', 'easyfoods')
)
cur = conn.cursor()

# Get vendor ID
cur.execute("SELECT id FROM vendors WHERE business_name = 'easytest' LIMIT 1")
vendor_result = cur.fetchone()
if not vendor_result:
    print("Vendor 'easytest' not found!")
    conn.close()
    exit(1)

vendor_id = vendor_result[0]
print(f"Adding products for vendor: {vendor_id}")

# Get category IDs
cur.execute("SELECT id, name FROM categories")
categories = {name: id for id, name in cur.fetchall()}

# More products to add
new_products = [
    {
        "name": "Palm Oil",
        "description": "Pure red palm oil, essential for African cooking",
        "price": 8.99,
        "category": "Oils & Condiments",
        "unit": "bottle",
        "stock_quantity": 50
    },
    {
        "name": "Plantain",
        "description": "Fresh ripe plantains",
        "price": 4.99,
        "category": "Fresh Produce",
        "unit": "bunch",
        "stock_quantity": 30
    },
    {
        "name": "Egusi Seeds",
        "description": "Ground melon seeds for soups",
        "price": 12.99,
        "category": "Legumes & Beans",
        "unit": "pack",
        "stock_quantity": 25
    },
    {
        "name": "Fufu Flour",
        "description": "Cassava fufu flour",
        "price": 6.99,
        "category": "Grains & Cereals",
        "unit": "bag",
        "stock_quantity": 40
    },
    {
        "name": "Jollof Rice Seasoning",
        "description": "Special blend for authentic jollof rice",
        "price": 5.99,
        "category": "Spices & Seasonings",
        "unit": "pack",
        "stock_quantity": 35
    },
    {
        "name": "Pineapple Juice",
        "description": "Fresh pineapple juice",
        "price": 3.99,
        "category": "Beverages",
        "unit": "bottle",
        "stock_quantity": 60
    },
    {
        "name": "Chin Chin",
        "description": "Sweet fried snack",
        "price": 4.99,
        "category": "Snacks & Sweets",
        "unit": "pack",
        "stock_quantity": 45
    },
    {
        "name": "Frozen Tilapia",
        "description": "Fresh frozen whole tilapia",
        "price": 9.99,
        "category": "Frozen Foods",
        "unit": "piece",
        "stock_quantity": 20
    }
]

for product in new_products:
    category_id = categories.get(product["category"])
    if not category_id:
        print(f"Category '{product['category']}' not found, skipping {product['name']}")
        continue
    
    # Generate slug
    slug = product["name"].lower().replace(" ", "-").replace("'", "").replace(",", "")
    slug = f"{slug}-{int(datetime.now().timestamp())}"
    
    try:
        cur.execute("""
            INSERT INTO products (
                id, vendor_id, name, description, price, category_id, 
                unit, stock_quantity, status, slug, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            str(uuid.uuid4()),
            str(vendor_id),
            product["name"],
            product["description"],
            product["price"],
            str(category_id),
            product["unit"],
            product["stock_quantity"],
            "active",
            slug,
            datetime.now(),
            datetime.now()
        ))
        print(f"✅ Added: {product['name']}")
    except Exception as e:
        print(f"❌ Failed to add {product['name']}: {e}")

conn.commit()
print(f"\n✅ Added {len(new_products)} products!")
cur.close()
conn.close()

