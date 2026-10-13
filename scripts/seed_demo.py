"""
Seed demo data so every app has something to show: a vendor with a store and products, a chef, a driver,
categories and recipes. (The admin identity is created automatically on first use.)

    python scripts/seed_demo.py

Idempotent: re-running skips rows that already exist (matched by email / slug).
"""
import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal  # noqa: E402
import app.main  # noqa: E402,F401  (registers every model)
from app.models.vendor import Vendor, VendorUser  # noqa: E402
from app.models.store import Store  # noqa: E402
from app.models.product import Product, Category  # noqa: E402
from app.models.chef import Chef  # noqa: E402
from app.models.driver import Driver  # noqa: E402
from app.models.recipe import Recipe  # noqa: E402

CATEGORIES = ["Grains & Flours", "Spices & Seasoning", "Oils & Sauces", "Fresh Produce", "Frozen & Fish", "Snacks & Drinks"]

PRODUCTS = [
    ("Long Grain Parboiled Rice 5kg", "Grains & Flours", 18.99, 15.99),
    ("Yellow Garri 2kg", "Grains & Flours", 9.49, None),
    ("Pounded Yam Flour 1.5kg", "Grains & Flours", 11.99, None),
    ("Egusi (Ground Melon Seeds) 500g", "Spices & Seasoning", 12.99, 10.99),
    ("Ogbono Seeds 300g", "Spices & Seasoning", 9.99, None),
    ("Suya Spice Blend 200g", "Spices & Seasoning", 6.49, None),
    ("Scotch Bonnet Peppers 250g", "Fresh Produce", 4.99, None),
    ("Ripe Plantains (6 pack)", "Fresh Produce", 5.99, 4.99),
    ("Pure Red Palm Oil 1L", "Oils & Sauces", 14.99, None),
    ("Dried Stockfish Head", "Frozen & Fish", 24.99, 21.99),
    ("Smoked Catfish 400g", "Frozen & Fish", 16.99, None),
    ("Chin Chin Crunchy Snack 300g", "Snacks & Drinks", 5.49, None),
    ("Zobo Hibiscus Drink 1L", "Snacks & Drinks", 4.29, None),
    ("Maggi Star Seasoning Cubes", "Spices & Seasoning", 3.99, None),
]

RECIPES = [
    ("Party Jollof Rice", "dinner", 20, 45, 6),
    ("Egusi Soup with Pounded Yam", "dinner", 25, 50, 4),
    ("Suya-Style Grilled Chicken", "lunch", 15, 25, 4),
    ("Fried Plantain & Eggs", "breakfast", 5, 15, 2),
]


def slugify(s: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in s).strip("-")


def main() -> None:
    db = SessionLocal()
    try:
        vendor = db.query(Vendor).filter(Vendor.email == "demo.market@eazyfoods.local").first()
        if not vendor:
            vendor = Vendor(
                business_name="Mama Ngozi African Market", business_type="grocery", email="demo.market@eazyfoods.local",
                phone="4165550101", street_address="123 Queen St W", city="Toronto", state="Ontario", postal_code="M5H 2N2",
                verification_status="verified", status="active",
            )
            db.add(vendor)
            db.flush()
            db.add(VendorUser(vendor_id=vendor.id, email=vendor.email, first_name="Ngozi", last_name="Okafor", role="store_owner"))
        store = db.query(Store).filter(Store.vendor_id == vendor.id).first()
        if not store:
            store = Store(vendor_id=vendor.id, name="Mama Ngozi — Queen St", street_address="123 Queen St W", city="Toronto",
                          state="Ontario", postal_code="M5H 2N2", is_primary=True, delivery_available=True, pickup_available=True)
            db.add(store)
            db.flush()

        cats = {}
        for name in CATEGORIES:
            c = db.query(Category).filter(Category.slug == slugify(name)).first() or Category(name=name, slug=slugify(name))
            db.add(c)
            db.flush()
            cats[name] = c

        for name, cat, price, sale in PRODUCTS:
            slug = slugify(name)
            if db.query(Product).filter(Product.slug == slug).first():
                continue
            db.add(Product(
                vendor_id=vendor.id, store_id=store.id, category_id=cats[cat].id, name=name, slug=slug,
                description=f"{name} — authentic, sourced for African kitchens.",
                price=Decimal(str(price)), sale_price=Decimal(str(sale)) if sale else None,
                stock_quantity=50, status="active",
            ))

        if not db.query(Chef).filter(Chef.email == "demo.chef@eazyfoods.local").first():
            db.add(Chef(
                email="demo.chef@eazyfoods.local", phone="4165550102", first_name="Adaeze", last_name="Eze", chef_name="Chef Adaeze",
                bio="Nigerian home cooking, made to order.", street_address="45 King St E", city="Toronto", state="Ontario",
                postal_code="M5C 1E9", cuisines=["Nigerian", "West African"], verification_status="verified", is_active=True,
            ))

        if not db.query(Driver).filter(Driver.email == "demo.driver@eazyfoods.local").first():
            db.add(Driver(
                email="demo.driver@eazyfoods.local", phone="4165550103", first_name="Tayo", last_name="Bright",
                street_address="12 Wheel Ave", city="Toronto", state="Ontario", postal_code="M4B 1B3",
                vehicle_type="car", verification_status="verified", is_active=True, is_available=True,
            ))

        for name, meal, prep, cook, serves in RECIPES:
            if not db.query(Recipe).filter(Recipe.slug == slugify(name)).first():
                db.add(Recipe(name=name, slug=slugify(name), meal_type=meal, prep_time_minutes=prep, cook_time_minutes=cook, servings=serves, is_active=True))

        db.commit()
        print("Demo data ready.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
