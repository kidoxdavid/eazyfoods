#!/usr/bin/env python3
"""
Script to add products to vendors and update their locations
"""
import psycopg2
import os
import uuid
from decimal import Decimal
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=os.getenv('DB_PORT', '5432'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_NAME', 'easyfoods')
)
cur = conn.cursor()

# Get all active vendors
cur.execute("SELECT id, business_name, city FROM vendors WHERE status = 'active'")
vendors = cur.fetchall()

if not vendors:
    print("No active vendors found!")
    exit(1)

# Get a category ID
cur.execute("SELECT id FROM categories LIMIT 1")
category = cur.fetchone()
category_id = category[0] if category else None

print(f"Found {len(vendors)} active vendor(s)")

# Sample African grocery products
products_data = [
    {
        'name': 'Jollof Rice Mix',
        'description': 'Authentic West African jollof rice seasoning mix - perfect for parties and celebrations',
        'price': 8.99,
        'stock_quantity': 25,
        'unit': 'pack',
        'slug': 'jollof-rice-mix',
        'is_featured': True
    },
    {
        'name': 'Plantain Chips',
        'description': 'Crispy fried plantain chips - perfect snack for any time of day',
        'price': 5.99,
        'stock_quantity': 40,
        'unit': 'pack',
        'slug': 'plantain-chips',
        'is_featured': True
    },
    {
        'name': 'Palm Oil',
        'description': 'Pure red palm oil - essential for authentic African cooking',
        'price': 12.99,
        'stock_quantity': 15,
        'unit': 'bottle',
        'slug': 'palm-oil'
    },
    {
        'name': 'Fufu Flour',
        'description': 'Traditional fufu flour for making authentic African fufu - ready to cook',
        'price': 6.99,
        'stock_quantity': 30,
        'unit': 'kg',
        'slug': 'fufu-flour'
    },
    {
        'name': 'Egusi Seeds',
        'description': 'Ground egusi seeds for soups and stews - rich in protein',
        'price': 9.99,
        'stock_quantity': 20,
        'unit': 'kg',
        'slug': 'egusi-seeds'
    },
    {
        'name': 'Ginger Root',
        'description': 'Fresh African ginger root - aromatic and flavorful',
        'price': 4.99,
        'stock_quantity': 50,
        'unit': 'kg',
        'slug': 'ginger-root'
    },
    {
        'name': 'Scotch Bonnet Peppers',
        'description': 'Hot scotch bonnet peppers - essential for spicy African dishes',
        'price': 7.99,
        'stock_quantity': 35,
        'unit': 'kg',
        'slug': 'scotch-bonnet-peppers'
    },
    {
        'name': 'Black Beans',
        'description': 'Premium black beans - great for traditional African dishes',
        'price': 5.49,
        'stock_quantity': 60,
        'unit': 'kg',
        'slug': 'black-beans'
    },
    {
        'name': 'Coconut Milk',
        'description': 'Rich and creamy coconut milk - perfect for curries and stews',
        'price': 3.99,
        'stock_quantity': 45,
        'unit': 'can',
        'slug': 'coconut-milk'
    },
    {
        'name': 'Yam',
        'description': 'Fresh African yam - staple food for many West African dishes',
        'price': 4.49,
        'stock_quantity': 28,
        'unit': 'kg',
        'slug': 'yam'
    },
    {
        'name': 'Groundnut (Peanut)',
        'description': 'Roasted groundnuts - perfect for snacks and cooking',
        'price': 6.99,
        'stock_quantity': 42,
        'unit': 'kg',
        'slug': 'groundnut-peanut'
    },
    {
        'name': 'Garri',
        'description': 'Premium garri (cassava flakes) - ready to eat or cook',
        'price': 5.99,
        'stock_quantity': 38,
        'unit': 'kg',
        'slug': 'garri'
    },
    {
        'name': 'Bitter Leaf',
        'description': 'Fresh bitter leaf - essential for Nigerian soups',
        'price': 4.99,
        'stock_quantity': 22,
        'unit': 'bunch',
        'slug': 'bitter-leaf'
    },
    {
        'name': 'Suya Spice Mix',
        'description': 'Authentic suya spice mix - perfect for grilled meats',
        'price': 8.49,
        'stock_quantity': 18,
        'unit': 'pack',
        'slug': 'suya-spice-mix',
        'is_featured': True
    },
    {
        'name': 'Pounded Yam Mix',
        'description': 'Instant pounded yam mix - quick and easy preparation',
        'price': 7.99,
        'stock_quantity': 32,
        'unit': 'kg',
        'slug': 'pounded-yam-mix'
    }
]

# Location data for vendors (different cities)
locations = [
    {
        'city': 'New York',
        'state': 'NY',
        'latitude': 40.7128,
        'longitude': -74.0060,
        'street_address': '123 African Market Street',
        'postal_code': '10001'
    },
    {
        'city': 'Calgary',
        'state': 'Alberta',
        'latitude': 51.0447,
        'longitude': -114.0719,
        'street_address': '456 African Grocery Avenue',
        'postal_code': 'T2P 1J9'
    }
]

# Update vendor locations and add products
for idx, vendor in enumerate(vendors):
    vendor_id = vendor[0]
    vendor_name = vendor[1]
    vendor_city = vendor[2]
    
    # Assign location based on city or use default
    location = locations[0]  # Default to New York
    if vendor_city and 'calgary' in vendor_city.lower():
        location = locations[1]
    elif idx > 0:
        location = locations[idx % len(locations)]
    
    # Update vendor location
    cur.execute("""
        UPDATE vendors 
        SET latitude = %s, longitude = %s, 
            city = %s, state = %s, 
            street_address = %s, postal_code = %s
        WHERE id = %s
    """, (
        location['latitude'],
        location['longitude'],
        location['city'],
        location['state'],
        location['street_address'],
        location['postal_code'],
        vendor_id
    ))
    print(f"\n✅ Updated location for {vendor_name}: {location['city']}, {location['state']} ({location['latitude']}, {location['longitude']})")
    
    # Check existing products for this vendor
    cur.execute("SELECT COUNT(*) FROM products WHERE vendor_id = %s", (vendor_id,))
    existing_count = cur.fetchone()[0]
    
    # Add products (skip if vendor already has many products)
    if existing_count < 5:
        products_to_add = products_data[:10] if existing_count == 0 else products_data[5:]
        
        for product in products_to_add:
            product_id = uuid.uuid4()
            try:
                # Check if slug already exists
                cur.execute("SELECT id FROM products WHERE slug = %s", (product['slug'],))
                if cur.fetchone():
                    print(f"  ⊘ Skipped: {product['name']} (slug exists)")
                    continue
                
                cur.execute("""
                    INSERT INTO products (
                        id, vendor_id, name, description, price, stock_quantity, unit, 
                        slug, status, category_id, is_featured, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    str(product_id),
                    str(vendor_id),
                    product['name'],
                    product['description'],
                    product['price'],
                    product['stock_quantity'],
                    product['unit'],
                    product['slug'],
                    'active',
                    str(category_id) if category_id else None,
                    product.get('is_featured', False),
                    datetime.now(),
                    datetime.now()
                ))
                print(f"  ✓ Added: {product['name']} - ${product['price']}")
            except psycopg2.IntegrityError as e:
                if 'slug' in str(e):
                    # Slug already exists, skip
                    print(f"  ⊘ Skipped: {product['name']} (slug exists)")
                else:
                    print(f"  ✗ Error adding {product['name']}: {e}")
    else:
        print(f"  ℹ {vendor_name} already has {existing_count} products, skipping product addition")

conn.commit()

# Summary
cur.execute("SELECT COUNT(*) FROM products WHERE status = 'active'")
total_products = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM vendors WHERE status = 'active' AND latitude IS NOT NULL")
vendors_with_location = cur.fetchone()[0]

print(f"\n{'='*60}")
print(f"✅ Summary:")
print(f"   - Total active products: {total_products}")
print(f"   - Vendors with locations: {vendors_with_location}")
print(f"{'='*60}")

cur.close()
conn.close()

