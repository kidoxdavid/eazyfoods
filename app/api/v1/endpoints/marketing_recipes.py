"""
Marketing recipe and meal plan endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.recipe import Recipe, RecipeIngredient
from app.models.meal_plan import MealPlan, MealPlanMeal
from app.models.product import Product
from app.models.vendor import Vendor
from app.models.store import Store
from app.api.v1.dependencies import get_current_admin
from pydantic import BaseModel

router = APIRouter()


# Recipe Schemas
class RecipeIngredientCreate(BaseModel):
    product_id: str
    quantity: float
    unit: str
    is_optional: bool = False
    notes: Optional[str] = None


class RecipeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    meal_type: str  # breakfast, lunch, dinner
    cuisine_type: Optional[str] = None
    african_region: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: int = 1
    difficulty: Optional[str] = None
    instructions: Optional[str] = None
    nutrition_info: Optional[dict] = None
    ingredients: List[RecipeIngredientCreate]


class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    meal_type: Optional[str] = None
    cuisine_type: Optional[str] = None
    african_region: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    instructions: Optional[str] = None
    nutrition_info: Optional[dict] = None
    is_active: Optional[bool] = None
    ingredients: Optional[List[RecipeIngredientCreate]] = None


# Meal Plan Schemas
class MealPlanMealCreate(BaseModel):
    recipe_id: str
    meal_type: str  # breakfast, lunch, dinner
    day_number: Optional[int] = None
    order: int = 0


class MealPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    plan_type: str  # one_day, one_week, one_month
    image_url: Optional[str] = None
    price: Optional[float] = None
    store_id: str  # Required: Store.id or Vendor.id (for vendors without stores)
    meals: List[MealPlanMealCreate]


class MealPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    plan_type: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    status: Optional[str] = None
    is_live: Optional[bool] = None
    store_id: Optional[str] = None
    meals: Optional[List[MealPlanMealCreate]] = None


def _get_vendor_id_for_store(store_id: str, db: Session) -> Optional[UUID]:
    """Resolve store_id (Store.id or Vendor.id) to vendor_id."""
    try:
        sid = UUID(store_id)
    except (ValueError, TypeError):
        return None
    store = db.query(Store).filter(Store.id == sid).first()
    if store:
        return store.vendor_id
    vendor = db.query(Vendor).filter(Vendor.id == sid).first()
    if vendor:
        return vendor.id
    return None


@router.get("/stores", response_model=List[dict])
async def get_stores_for_meal_plans(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get stores/vendors for meal plan assignment (same ids as customer_stores for checkout)."""
    stores_list = db.query(Store).join(Vendor).filter(
        Vendor.status == "active",
        Store.is_active == True
    ).all()
    vendors = db.query(Vendor).filter(Vendor.status == "active").all()
    vendors_with_stores = {s.vendor_id for s in stores_list}
    vendors_without_stores = [v for v in vendors if v.id not in vendors_with_stores]
    result = []
    for store in stores_list:
        v = store.vendor
        result.append({
            "id": str(store.id),
            "vendor_id": str(v.id),
            "store_name": store.name,
            "business_name": v.business_name,
            "city": store.city,
            "state": store.state
        })
    for v in vendors_without_stores:
        result.append({
            "id": str(v.id),
            "vendor_id": str(v.id),
            "store_name": v.business_name,
            "business_name": v.business_name,
            "city": v.city,
            "state": v.state
        })
    return result


# Recipe Endpoints
@router.get("/recipes", response_model=List[dict])
async def get_recipes(
    skip: int = 0,
    limit: int = 50,
    meal_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    store_id: Optional[str] = Query(None, description="Filter to recipes whose ingredients all come from this store's vendor"),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all recipes, optionally filtered by store (single-store meal plans)."""
    query = db.query(Recipe)
    
    if meal_type:
        query = query.filter(Recipe.meal_type == meal_type)
    if is_active is not None:
        query = query.filter(Recipe.is_active == is_active)

    if store_id:
        vendor_id = _get_vendor_id_for_store(store_id, db)
        if not vendor_id:
            raise HTTPException(status_code=400, detail="Invalid store_id")
        from sqlalchemy import func
        subq_ok = db.query(RecipeIngredient.recipe_id, func.count(RecipeIngredient.id).label('cnt')).join(
            RecipeIngredient.product
        ).filter(Product.vendor_id == vendor_id).group_by(RecipeIngredient.recipe_id).subquery()
        subq_all = db.query(RecipeIngredient.recipe_id, func.count(RecipeIngredient.id).label('cnt')).group_by(
            RecipeIngredient.recipe_id
        ).subquery()
        valid_ids = db.query(subq_all.c.recipe_id).join(
            subq_ok, (subq_all.c.recipe_id == subq_ok.c.recipe_id) & (subq_all.c.cnt == subq_ok.c.cnt)
        ).all()
        valid_recipe_ids = [r[0] for r in valid_ids] if valid_ids else []
        query = query.filter(Recipe.id.in_(valid_recipe_ids))
    
    recipes = query.order_by(Recipe.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for recipe in recipes:
        ingredients = db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.id).all()
        result.append({
            "id": str(recipe.id),
            "name": recipe.name,
            "slug": recipe.slug,
            "description": recipe.description,
            "image_url": recipe.image_url,
            "meal_type": recipe.meal_type,
            "cuisine_type": recipe.cuisine_type,
            "prep_time_minutes": recipe.prep_time_minutes,
            "cook_time_minutes": recipe.cook_time_minutes,
            "servings": recipe.servings,
            "difficulty": recipe.difficulty,
            "instructions": recipe.instructions,
            "nutrition_info": recipe.nutrition_info,
            "is_active": recipe.is_active,
            "ingredients": [
                {
                    "id": str(ing.id),
                    "product_id": str(ing.product_id),
                    "quantity": float(ing.quantity),
                    "unit": ing.unit,
                    "is_optional": ing.is_optional,
                    "notes": ing.notes
                }
                for ing in ingredients
            ],
            "created_at": recipe.created_at
        })
    
    return result


@router.get("/recipes/{recipe_id}", response_model=dict)
async def get_recipe(
    recipe_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get a single recipe"""
    from sqlalchemy.orm import joinedload
    recipe = db.query(Recipe).filter(Recipe.id == UUID(recipe_id)).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    ingredients = db.query(RecipeIngredient).options(
        joinedload(RecipeIngredient.product)
    ).filter(RecipeIngredient.recipe_id == recipe.id).all()
    
    ing_list = []
    for ing in ingredients:
        product = ing.product
        product_name = product.name if product else None
        product_image_url = (product.image_url if product and product.image_url else None)
        ing_list.append({
            "id": str(ing.id),
            "product_id": str(ing.product_id),
            "product_name": product_name,
            "image_url": product_image_url,
            "quantity": float(ing.quantity),
            "unit": ing.unit,
            "is_optional": ing.is_optional,
            "notes": ing.notes,
            "product": {
                "id": str(product.id),
                "name": product.name,
                "price": float(product.price),
                "image_url": product.image_url
            } if product else None
        })
    
    return {
        "id": str(recipe.id),
        "name": recipe.name,
        "slug": recipe.slug,
        "description": recipe.description,
        "image_url": recipe.image_url,
        "meal_type": recipe.meal_type,
        "cuisine_type": recipe.cuisine_type,
        "prep_time_minutes": recipe.prep_time_minutes,
        "cook_time_minutes": recipe.cook_time_minutes,
        "servings": recipe.servings,
        "difficulty": recipe.difficulty,
        "instructions": recipe.instructions,
        "nutrition_info": recipe.nutrition_info,
        "is_active": recipe.is_active,
        "ingredients": ing_list
    }


@router.post("/recipes", response_model=dict, status_code=201)
async def create_recipe(
    recipe_data: RecipeCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new recipe"""
    import re
    
    # Generate slug from name
    slug = re.sub(r'[^a-z0-9]+', '-', recipe_data.name.lower()).strip('-')
    
    # Ensure slug is unique
    existing = db.query(Recipe).filter(Recipe.slug == slug).first()
    if existing:
        slug = f"{slug}-{datetime.utcnow().timestamp()}"
    
    recipe = Recipe(
        name=recipe_data.name,
        slug=slug,
        description=recipe_data.description,
        image_url=recipe_data.image_url,
        meal_type=recipe_data.meal_type,
        cuisine_type=recipe_data.cuisine_type,
        african_region=recipe_data.african_region,
        prep_time_minutes=recipe_data.prep_time_minutes,
        cook_time_minutes=recipe_data.cook_time_minutes,
        servings=recipe_data.servings,
        difficulty=recipe_data.difficulty,
        instructions=recipe_data.instructions,
        nutrition_info=recipe_data.nutrition_info,
        is_active=True
    )
    
    db.add(recipe)
    db.flush()
    
    # Add ingredients
    for ing_data in recipe_data.ingredients:
        # Verify product exists
        product = db.query(Product).filter(Product.id == UUID(ing_data.product_id)).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product {ing_data.product_id} not found")
        
        ingredient = RecipeIngredient(
            recipe_id=recipe.id,
            product_id=UUID(ing_data.product_id),
            quantity=ing_data.quantity,
            unit=ing_data.unit,
            is_optional=ing_data.is_optional,
            notes=ing_data.notes
        )
        db.add(ingredient)
    
    db.commit()
    db.refresh(recipe)
    
    return {
        "id": str(recipe.id),
        "name": recipe.name,
        "message": "Recipe created successfully"
    }


@router.put("/recipes/{recipe_id}", response_model=dict)
async def update_recipe(
    recipe_id: str,
    recipe_data: RecipeUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a recipe"""
    recipe = db.query(Recipe).filter(Recipe.id == UUID(recipe_id)).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if recipe_data.name:
        recipe.name = recipe_data.name
    if recipe_data.description is not None:
        recipe.description = recipe_data.description
    if recipe_data.image_url is not None:
        recipe.image_url = recipe_data.image_url
    if recipe_data.meal_type:
        recipe.meal_type = recipe_data.meal_type
    if recipe_data.cuisine_type is not None:
        recipe.cuisine_type = recipe_data.cuisine_type
    if recipe_data.african_region is not None:
        recipe.african_region = recipe_data.african_region
    if recipe_data.prep_time_minutes is not None:
        recipe.prep_time_minutes = recipe_data.prep_time_minutes
    if recipe_data.cook_time_minutes is not None:
        recipe.cook_time_minutes = recipe_data.cook_time_minutes
    if recipe_data.servings is not None:
        recipe.servings = recipe_data.servings
    if recipe_data.difficulty is not None:
        recipe.difficulty = recipe_data.difficulty
    if recipe_data.instructions is not None:
        recipe.instructions = recipe_data.instructions
    if recipe_data.nutrition_info is not None:
        recipe.nutrition_info = recipe_data.nutrition_info
    if recipe_data.is_active is not None:
        recipe.is_active = recipe_data.is_active
    
    if recipe_data.ingredients is not None:
        db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.id).delete()
        for ing_data in recipe_data.ingredients:
            product = db.query(Product).filter(Product.id == UUID(ing_data.product_id)).first()
            if not product:
                db.rollback()
                raise HTTPException(status_code=404, detail=f"Product {ing_data.product_id} not found")
            ingredient = RecipeIngredient(
                recipe_id=recipe.id,
                product_id=UUID(ing_data.product_id),
                quantity=ing_data.quantity,
                unit=ing_data.unit,
                is_optional=ing_data.is_optional,
                notes=ing_data.notes
            )
            db.add(ingredient)
    
    db.commit()
    
    return {"message": "Recipe updated successfully"}


@router.delete("/recipes/{recipe_id}", response_model=dict)
async def delete_recipe(
    recipe_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a recipe"""
    recipe = db.query(Recipe).filter(Recipe.id == UUID(recipe_id)).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    db.delete(recipe)
    db.commit()
    
    return {"message": "Recipe deleted successfully"}


@router.get("/meal-plans/{plan_id}", response_model=dict)
async def get_meal_plan(
    plan_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get a single meal plan"""
    meal_plan = db.query(MealPlan).filter(MealPlan.id == UUID(plan_id)).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    meals = db.query(MealPlanMeal).filter(MealPlanMeal.meal_plan_id == meal_plan.id).order_by(MealPlanMeal.day_number, MealPlanMeal.order).all()
    
    return {
        "id": str(meal_plan.id),
        "name": meal_plan.name,
        "description": meal_plan.description,
        "plan_type": meal_plan.plan_type,
        "image_url": meal_plan.image_url,
        "status": meal_plan.status,
        "is_live": meal_plan.is_live,
        "price": float(meal_plan.price) if meal_plan.price else None,
        "store_id": str(meal_plan.store_id) if meal_plan.store_id else None,
        "meals": [
            {
                "id": str(meal.id),
                "recipe_id": str(meal.recipe_id),
                "meal_type": meal.meal_type,
                "day_number": meal.day_number,
                "order": meal.order,
                "recipe": {
                    "id": str(meal.recipe.id),
                    "name": meal.recipe.name,
                    "image_url": meal.recipe.image_url,
                    "meal_type": meal.recipe.meal_type
                } if meal.recipe else None
            }
            for meal in meals
        ],
        "created_at": meal_plan.created_at.isoformat() if meal_plan.created_at else None
    }


@router.delete("/meal-plans/{plan_id}", response_model=dict)
async def delete_meal_plan(
    plan_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a meal plan"""
    meal_plan = db.query(MealPlan).filter(MealPlan.id == UUID(plan_id)).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    db.delete(meal_plan)
    db.commit()
    
    return {"message": "Meal plan deleted successfully"}


# Meal Plan Endpoints
@router.get("/meal-plans", response_model=List[dict])
async def get_meal_plans(
    skip: int = 0,
    limit: int = 50,
    plan_type: Optional[str] = None,
    is_live: Optional[bool] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all meal plans"""
    query = db.query(MealPlan)
    
    if plan_type:
        query = query.filter(MealPlan.plan_type == plan_type)
    if is_live is not None:
        query = query.filter(MealPlan.is_live == is_live)
    
    meal_plans = query.order_by(MealPlan.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for plan in meal_plans:
        meals = db.query(MealPlanMeal).filter(MealPlanMeal.meal_plan_id == plan.id).order_by(MealPlanMeal.day_number, MealPlanMeal.order).all()
        result.append({
            "id": str(plan.id),
            "name": plan.name,
            "description": plan.description,
            "plan_type": plan.plan_type,
            "image_url": plan.image_url,
            "status": plan.status,
            "is_live": plan.is_live,
            "price": float(plan.price) if plan.price else None,
            "meals": [
                {
                    "id": str(meal.id),
                    "recipe_id": str(meal.recipe_id),
                    "meal_type": meal.meal_type,
                    "day_number": meal.day_number,
                    "order": meal.order,
                    "recipe": {
                        "id": str(meal.recipe.id),
                        "name": meal.recipe.name,
                        "image_url": meal.recipe.image_url
                    } if meal.recipe else None
                }
                for meal in meals
            ],
            "created_at": plan.created_at.isoformat() if plan.created_at else None
        })
    
    return result


def _validate_recipes_from_store(recipe_ids: list, store_id: str, db: Session) -> None:
    """Raise HTTPException if any recipe has ingredients from a different vendor."""
    vendor_id = _get_vendor_id_for_store(store_id, db)
    if not vendor_id:
        raise HTTPException(status_code=400, detail="Invalid store_id")
    from sqlalchemy import func
    for rid in recipe_ids:
        ing_count = db.query(func.count(RecipeIngredient.id)).filter(RecipeIngredient.recipe_id == UUID(rid)).scalar() or 0
        ok_count = db.query(func.count(RecipeIngredient.id)).join(RecipeIngredient.product).filter(
            RecipeIngredient.recipe_id == UUID(rid),
            Product.vendor_id == vendor_id
        ).scalar() or 0
        if ing_count != ok_count or ing_count == 0:
            recipe = db.query(Recipe).filter(Recipe.id == UUID(rid)).first()
            rname = recipe.name if recipe else rid
            raise HTTPException(
                status_code=400,
                detail=f"Recipe '{rname}' has ingredients from multiple stores. All recipes must use ingredients from the selected store only."
            )


@router.post("/meal-plans", response_model=dict, status_code=201)
async def create_meal_plan(
    plan_data: MealPlanCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new meal plan (single store only)."""
    recipe_ids = [m.recipe_id for m in plan_data.meals]
    _validate_recipes_from_store(recipe_ids, plan_data.store_id, db)
    
    meal_plan = MealPlan(
        name=plan_data.name,
        description=plan_data.description,
        plan_type=plan_data.plan_type,
        image_url=plan_data.image_url,
        price=plan_data.price,
        store_id=UUID(plan_data.store_id),
        status="draft",
        is_live=False,
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(meal_plan)
    db.flush()
    
    # Add meals
    for meal_data in plan_data.meals:
        # Verify recipe exists
        recipe = db.query(Recipe).filter(Recipe.id == UUID(meal_data.recipe_id)).first()
        if not recipe:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Recipe {meal_data.recipe_id} not found")
        
        meal = MealPlanMeal(
            meal_plan_id=meal_plan.id,
            recipe_id=UUID(meal_data.recipe_id),
            meal_type=meal_data.meal_type,
            day_number=meal_data.day_number,
            order=meal_data.order
        )
        db.add(meal)
    
    db.commit()
    db.refresh(meal_plan)
    
    return {
        "id": str(meal_plan.id),
        "name": meal_plan.name,
        "message": "Meal plan created successfully"
    }


@router.put("/meal-plans/{plan_id}/publish", response_model=dict)
async def publish_meal_plan(
    plan_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Publish a meal plan (make it live on customer side)"""
    meal_plan = db.query(MealPlan).filter(MealPlan.id == UUID(plan_id)).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    meal_plan.is_live = True
    meal_plan.status = "active"
    db.commit()
    
    return {"message": "Meal plan published successfully"}


@router.put("/meal-plans/{plan_id}", response_model=dict)
async def update_meal_plan(
    plan_id: str,
    plan_data: MealPlanUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a meal plan"""
    meal_plan = db.query(MealPlan).filter(MealPlan.id == UUID(plan_id)).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    if plan_data.name:
        meal_plan.name = plan_data.name
    if plan_data.description is not None:
        meal_plan.description = plan_data.description
    if plan_data.plan_type:
        meal_plan.plan_type = plan_data.plan_type
    if plan_data.image_url is not None:
        meal_plan.image_url = plan_data.image_url
    if plan_data.price is not None:
        meal_plan.price = plan_data.price
    if plan_data.status:
        meal_plan.status = plan_data.status
    if plan_data.is_live is not None:
        meal_plan.is_live = plan_data.is_live
    if plan_data.store_id is not None:
        meal_plan.store_id = UUID(plan_data.store_id)
    
    if plan_data.meals is not None:
        store_to_validate = plan_data.store_id or (str(meal_plan.store_id) if meal_plan.store_id else None)
        if store_to_validate:
            recipe_ids = [m.recipe_id for m in plan_data.meals]
            if recipe_ids:
                _validate_recipes_from_store(recipe_ids, store_to_validate, db)
        db.query(MealPlanMeal).filter(MealPlanMeal.meal_plan_id == meal_plan.id).delete()
        for i, meal_data in enumerate(plan_data.meals):
            meal = MealPlanMeal(
                meal_plan_id=meal_plan.id,
                recipe_id=UUID(meal_data.recipe_id),
                meal_type=meal_data.meal_type,
                day_number=meal_data.day_number or 1,
                order=meal_data.order if meal_data.order is not None else i
            )
            db.add(meal)
    
    db.commit()
    
    return {"message": "Meal plan updated successfully"}


@router.get("/products", response_model=List[dict])
async def get_products_for_recipes(
    search: Optional[str] = None,
    store_id: Optional[str] = Query(None, description="Filter to products from this store's vendor only"),
    limit: int = 100,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get products for recipe ingredient selection - only from active stores/vendors.
    When store_id is provided, only products from that store's vendor are returned."""
    # Only get products from active vendors/stores
    query = db.query(Product).join(
        Vendor, Product.vendor_id == Vendor.id
    ).filter(
        Product.status == "active",
        Vendor.status == "active"
    )

    if store_id:
        vendor_id = _get_vendor_id_for_store(store_id, db)
        if not vendor_id:
            raise HTTPException(status_code=400, detail="Invalid store_id")
        query = query.filter(Product.vendor_id == vendor_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term)
            )
        )
    
    products = query.order_by(Product.name).limit(limit).all()
    
    result = []
    for p in products:
        try:
            result.append({
                "id": str(p.id),
                "name": p.name,
                "description": p.description or "",
                "price": float(p.price) if p.price else 0.0,
                "image_url": p.image_url,
                "unit": p.unit or "piece",
                "vendor_name": p.vendor.business_name if p.vendor else None
            })
        except Exception as e:
            # Skip products with errors
            continue
    
    return result

