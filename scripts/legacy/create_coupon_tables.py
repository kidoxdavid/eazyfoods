"""
Create coupon tables in the database
"""
from app.core.database import engine, Base
# Import all models to ensure foreign key relationships are resolved
from app.models.coupon import Coupon, CouponUsage
from app.models.customer import Customer
from app.models.order import Order

if __name__ == "__main__":
    print("Creating coupon tables...")
    Base.metadata.create_all(bind=engine, tables=[Coupon.__table__, CouponUsage.__table__])
    print("Coupon tables created successfully!")

