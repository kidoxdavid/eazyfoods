"""
Create meal plan tables
"""
from app.core.database import engine, Base
from app.models.meal_plan import MealPlan, MealPlanMeal

if __name__ == "__main__":
    print("Creating meal plan tables...")
    Base.metadata.create_all(bind=engine, tables=[MealPlan.__table__, MealPlanMeal.__table__])
    print("Tables created successfully!")

