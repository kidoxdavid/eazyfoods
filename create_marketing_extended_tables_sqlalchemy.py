"""
Create marketing extended tables using SQLAlchemy
"""
from app.core.database import engine, Base
# Import all models to ensure they're registered with Base
from app.models.admin import AdminUser
from app.models.customer import Customer
from app.models.marketing import (
    Audience, ABTest, SocialMediaPost, Notification, 
    AutomationWorkflow, MarketingBudget, Contact, ContentLibrary
)

def create_tables():
    """Create all marketing extended tables"""
    try:
        # Create only the new marketing extended tables
        tables_to_create = [
            Audience.__table__,
            ABTest.__table__,
            SocialMediaPost.__table__,
            Notification.__table__,
            AutomationWorkflow.__table__,
            MarketingBudget.__table__,
            Contact.__table__,
            ContentLibrary.__table__
        ]
        
        for table in tables_to_create:
            table.create(bind=engine, checkfirst=True)
        
        print("Marketing extended tables created successfully!")
    except Exception as e:
        print(f"Error creating tables: {e}")
        raise

if __name__ == "__main__":
    create_tables()

