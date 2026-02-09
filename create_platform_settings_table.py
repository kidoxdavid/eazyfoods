"""
Create platform_settings table
"""
from app.core.database import engine, Base
from app.models.platform_settings import PlatformSettings

if __name__ == "__main__":
    print("Creating platform_settings table...")
    Base.metadata.create_all(bind=engine, tables=[PlatformSettings.__table__])
    print("Table created successfully!")

