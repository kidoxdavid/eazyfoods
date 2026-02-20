"""
Customer-facing recipe endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from app.core.database import get_db
from app.models.recipe import Recipe, RecipeIngredient
from app.models.meal_plan import MealPlan, MealPlanMeal
from app.models.product import Product
from app.schemas.recipe import RecipeResponse, RecipeListResponse
from uuid import UUID

router = APIRouter()


@router.get("/", response_model=List[RecipeListResponse])
async def get_recipes(
    meal_type: Optional[str] = Query(None, pattern="^(breakfast|lunch|dinner)$"),
    cuisine_type: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None, pattern="^(easy|medium|hard)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all active recipes"""
    query = db.query(Recipe).filter(Recipe.is_active == True)
    
    if meal_type:
        query = query.filter(Recipe.meal_type == meal_type)
    if cuisine_type:
        query = query.filter(Recipe.cuisine_type.ilike(f"%{cuisine_type}%"))
    if difficulty:
        query = query.filter(Recipe.difficulty == difficulty)
    
    recipes = query.order_by(Recipe.name).offset(skip).limit(limit).all()
    
    # Manually format response to ensure proper serialization
    result = []
    for recipe in recipes:
        result.append({
            "id": str(recipe.id),
            "name": recipe.name,
            "slug": recipe.slug or "",
            "description": recipe.description,
            "image_url": recipe.image_url,
            "meal_type": recipe.meal_type,
            "cuisine_type": recipe.cuisine_type,
            "prep_time_minutes": recipe.prep_time_minutes,
            "cook_time_minutes": recipe.cook_time_minutes,
            "servings": recipe.servings,
            "difficulty": recipe.difficulty
        })
    
    return result


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: str,
    db: Session = Depends(get_db)
):
    """Get a single recipe with all ingredients"""
    try:
        recipe_uuid = UUID(recipe_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid recipe ID format")
    
    recipe = db.query(Recipe).options(
        joinedload(Recipe.ingredients).joinedload(RecipeIngredient.product)
    ).filter(
        Recipe.id == recipe_uuid,
        Recipe.is_active == True
    ).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Format response with product details
    recipe_dict = {
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
        "created_at": str(recipe.created_at) if recipe.created_at else None,
        "updated_at": str(recipe.updated_at) if recipe.updated_at else None,
        "ingredients": []
    }
    
    # Format ingredients with product details
    for ing in recipe.ingredients:
        product = ing.product
        product_price = float(product.price) if product and product.price is not None else 0.0
        ingredient_dict = {
            "id": str(ing.id),
            "product_id": str(ing.product_id),
            "quantity": float(ing.quantity),
            "unit": ing.unit or "",
            "is_optional": ing.is_optional,
            "notes": ing.notes,
            "product": {
                "id": str(product.id),
                "name": product.name,
                "image_url": product.image_url,
                "price": product_price,
                "stock_quantity": product.stock_quantity,
                "unit": product.unit
            } if product else None
        }
        recipe_dict["ingredients"].append(ingredient_dict)
    
    return recipe_dict


@router.post("/{recipe_id}/add-to-cart")
async def add_recipe_to_cart(
    recipe_id: str,
    household_size: int = Query(1, ge=1, le=10),  # Number of people (default 1)
    db: Session = Depends(get_db)
):
    """Get recipe ingredients with adjusted quantities for household size"""
    try:
        recipe_uuid = UUID(recipe_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid recipe ID format")
    
    recipe = db.query(Recipe).options(
        joinedload(Recipe.ingredients).joinedload(RecipeIngredient.product)
    ).filter(
        Recipe.id == recipe_uuid,
        Recipe.is_active == True
    ).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Calculate multiplier based on household size
    # Base recipe is for 1 person, so multiply by household_size
    multiplier = household_size
    
    # Prepare cart items with adjusted quantities
    cart_items = []
    for ing in recipe.ingredients:
        if not ing.product:
            continue  # Skip if product doesn't exist
        
        adjusted_quantity = float(ing.quantity) * multiplier
        
        cart_items.append({
            "product_id": str(ing.product_id),
            "product_name": ing.product.name,
            "quantity": adjusted_quantity,
            "unit": ing.unit,
            "is_optional": ing.is_optional,
            "notes": ing.notes,
            "product": {
                "id": str(ing.product.id),
                "name": ing.product.name,
                "image_url": ing.product.image_url,
                "price": float(ing.product.price),
                "stock_quantity": ing.product.stock_quantity,
                "unit": ing.product.unit
            }
        })
    
    return {
        "recipe_id": str(recipe.id),
        "recipe_name": recipe.name,
        "household_size": household_size,
        "items": cart_items
    }


@router.get("/meal-plans/suggested", response_model=List[dict])
async def get_suggested_meal_plans(
    db: Session = Depends(get_db)
):
    """Suggest meal plans built from available recipes (e.g. breakfast week, easy dinners)."""
    recipes = db.query(Recipe).filter(Recipe.is_active == True).order_by(Recipe.name).limit(50).all()
    if not recipes:
        return []
    by_meal = {"breakfast": [], "lunch": [], "dinner": []}
    for r in recipes:
        mt = (r.meal_type or "dinner").lower()
        if mt in by_meal:
            by_meal[mt].append(r)
    suggestions = []
    # "7-Day Breakfast" – first 7 breakfast recipes
    if len(by_meal["breakfast"]) >= 7:
        meals = [
            {"recipe_id": str(by_meal["breakfast"][i].id), "day_number": i + 1, "meal_type": "breakfast",
             "recipe": {"id": str(by_meal["breakfast"][i].id), "name": by_meal["breakfast"][i].name, "image_url": by_meal["breakfast"][i].image_url, "meal_type": "breakfast"}}
            for i in range(7)
        ]
        suggestions.append({
            "id": "suggested-breakfast-week",
            "name": "7-Day Breakfast Ideas",
            "description": "A week of breakfast recipes from our collection.",
            "plan_type": "one_week",
            "image_url": by_meal["breakfast"][0].image_url if by_meal["breakfast"] else None,
            "meal_count": 7,
            "suggested": True,
            "meals": meals
        })
    # "Easy Dinners" – up to 5 easy dinner recipes
    easy_dinners = [r for r in recipes if (r.difficulty or "").lower() == "easy" and (r.meal_type or "").lower() == "dinner"][:5]
    if not easy_dinners and by_meal["dinner"]:
        easy_dinners = by_meal["dinner"][:5]
    if easy_dinners:
        meals = [
            {"recipe_id": str(r.id), "day_number": i + 1, "meal_type": "dinner",
             "recipe": {"id": str(r.id), "name": r.name, "image_url": r.image_url, "meal_type": "dinner"}}
            for i, r in enumerate(easy_dinners)
        ]
        suggestions.append({
            "id": "suggested-easy-dinners",
            "name": "Easy Dinners (5 days)",
            "description": "Simple dinner recipes for the week.",
            "plan_type": "one_week",
            "image_url": easy_dinners[0].image_url if easy_dinners else None,
            "meal_count": len(meals),
            "suggested": True,
            "meals": meals
        })
    # "This week's picks" – mix of 7 recipes
    mix = recipes[:7] if len(recipes) >= 7 else recipes
    if mix:
        meal_types = ["breakfast", "lunch", "dinner"]
        meals = [
            {"recipe_id": str(r.id), "day_number": (i % 7) + 1, "meal_type": (r.meal_type or meal_types[i % 3]).lower()[:10] or "dinner",
             "recipe": {"id": str(r.id), "name": r.name, "image_url": r.image_url, "meal_type": r.meal_type or "dinner"}}
            for i, r in enumerate(mix)
        ]
        suggestions.append({
            "id": "suggested-week-picks",
            "name": "This Week's Picks",
            "description": "Curated recipes from our collection.",
            "plan_type": "one_week",
            "image_url": mix[0].image_url if mix else None,
            "meal_count": len(meals),
            "suggested": True,
            "meals": meals
        })
    return suggestions


@router.get("/meal-plans", response_model=List[dict])
async def get_meal_plans(
    plan_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all live meal plans"""
    query = db.query(MealPlan).filter(
        MealPlan.is_live == True,
        MealPlan.status == "active"
    )
    
    if plan_type:
        query = query.filter(MealPlan.plan_type == plan_type)
    
    meal_plans = query.order_by(MealPlan.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for plan in meal_plans:
        meals = db.query(MealPlanMeal).filter(
            MealPlanMeal.meal_plan_id == plan.id
        ).order_by(MealPlanMeal.day_number, MealPlanMeal.order).all()
        
        result.append({
            "id": str(plan.id),
            "name": plan.name,
            "description": plan.description,
            "plan_type": plan.plan_type,
            "image_url": plan.image_url,
            "price": float(plan.price) if plan.price else None,
            "meal_count": len(meals),
            "meals": [
                {
                    "id": str(meal.id),
                    "recipe_id": str(meal.recipe_id),
                    "meal_type": meal.meal_type,
                    "day_number": meal.day_number,
                    "recipe": {
                        "id": str(meal.recipe.id),
                        "name": meal.recipe.name,
                        "image_url": meal.recipe.image_url,
                        "meal_type": meal.recipe.meal_type
                    } if meal.recipe else None
                }
                for meal in meals
            ]
        })
    
    return result


@router.get("/meal-plans/{plan_id}", response_model=dict)
async def get_meal_plan(
    plan_id: str,
    db: Session = Depends(get_db)
):
    """Get a single meal plan with all recipes"""
    try:
        plan_uuid = UUID(plan_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid meal plan ID format")
    
    meal_plan = db.query(MealPlan).filter(
        MealPlan.id == plan_uuid,
        MealPlan.is_live == True
    ).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    meals = db.query(MealPlanMeal).options(
        joinedload(MealPlanMeal.recipe).joinedload(Recipe.ingredients).joinedload(RecipeIngredient.product)
    ).filter(
        MealPlanMeal.meal_plan_id == meal_plan.id
    ).order_by(MealPlanMeal.day_number, MealPlanMeal.order).all()
    
    return {
        "id": str(meal_plan.id),
        "name": meal_plan.name,
        "description": meal_plan.description,
        "plan_type": meal_plan.plan_type,
        "image_url": meal_plan.image_url,
        "price": float(meal_plan.price) if meal_plan.price else None,
        "store_id": str(meal_plan.store_id) if meal_plan.store_id else None,
        "meals": [
            {
                "id": str(meal.id),
                "recipe_id": str(meal.recipe_id),
                "meal_type": meal.meal_type,
                "day_number": meal.day_number,
                "recipe": {
                    "id": str(meal.recipe.id),
                    "name": meal.recipe.name,
                    "image_url": meal.recipe.image_url,
                    "meal_type": meal.recipe.meal_type,
                    "ingredients": [
                        {
                            "product_id": str(ing.product_id),
                            "quantity": float(ing.quantity),
                            "unit": ing.unit,
                            "product": {
                                "id": str(ing.product.id),
                                "name": ing.product.name,
                                "price": float(ing.product.price),
                                "image_url": ing.product.image_url
                            } if ing.product else None
                        }
                        for ing in meal.recipe.ingredients
                    ] if meal.recipe else []
                } if meal.recipe else None
            }
            for meal in meals
        ]
    }


@router.post("/meal-plans/{plan_id}/add-to-cart")
async def add_meal_plan_to_cart(
    plan_id: str,
    household_size: int = Query(1, ge=1, le=10),  # Number of people (default 1)
    db: Session = Depends(get_db)
):
    """Get meal plan ingredients with adjusted quantities for household size"""
    try:
        plan_uuid = UUID(plan_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid meal plan ID format")
    
    meal_plan = db.query(MealPlan).filter(
        MealPlan.id == plan_uuid,
        MealPlan.is_live == True
    ).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    meals = db.query(MealPlanMeal).options(
        joinedload(MealPlanMeal.recipe).joinedload(Recipe.ingredients).joinedload(RecipeIngredient.product)
    ).filter(
        MealPlanMeal.meal_plan_id == meal_plan.id
    ).all()
    
    # Aggregate all ingredients across all meals
    # Group by product_id and sum quantities
    ingredient_map = {}
    
    for meal in meals:
        if not meal.recipe:
            continue
        
        for ing in meal.recipe.ingredients:
            if not ing.product:
                continue
            
            product_id = str(ing.product_id)
            if product_id not in ingredient_map:
                product_data = {
                    "id": str(ing.product.id),
                    "name": ing.product.name,
                    "image_url": ing.product.image_url,
                    "price": float(ing.product.price),
                    "unit": ing.product.unit
                }
                if meal_plan.store_id:
                    product_data["store_id"] = str(meal_plan.store_id)
                ingredient_map[product_id] = {
                    "product_id": product_id,
                    "product_name": ing.product.name,
                    "quantity": 0,
                    "unit": ing.unit,
                    "product": product_data
                }
            
            # Add quantity (base is for 1 person, multiply by household_size)
            ingredient_map[product_id]["quantity"] += float(ing.quantity) * household_size
    
    cart_items = list(ingredient_map.values())
    
    return {
        "meal_plan_id": str(meal_plan.id),
        "meal_plan_name": meal_plan.name,
        "household_size": household_size,
        "items": cart_items
    }


@router.post("/meal-plans/add-to-cart-from-recipes")
async def add_to_cart_from_recipes(
    body: dict,
    db: Session = Depends(get_db)
):
    """Build a meal plan from selected recipes and return cart items (no plan saved). Body: { meals: [{ recipe_id, day_number, meal_type }], household_size: 1 }."""
    meals_data = body.get("meals") or []
    household_size = max(1, min(10, body.get("household_size") or 1))
    if not meals_data:
        raise HTTPException(status_code=400, detail="meals array is required")
    ingredient_map = {}
    plan_name = body.get("name") or "My meal plan"
    for entry in meals_data:
        recipe_id = entry.get("recipe_id")
        if not recipe_id:
            continue
        try:
            recipe_uuid = UUID(recipe_id)
        except (ValueError, TypeError):
            continue
        recipe = db.query(Recipe).options(
            joinedload(Recipe.ingredients).joinedload(RecipeIngredient.product)
        ).filter(Recipe.id == recipe_uuid, Recipe.is_active == True).first()
        if not recipe:
            continue
        for ing in recipe.ingredients:
            if not ing.product:
                continue
            product_id = str(ing.product_id)
            if product_id not in ingredient_map:
                ingredient_map[product_id] = {
                    "product_id": product_id,
                    "product_name": ing.product.name,
                    "quantity": 0,
                    "unit": ing.unit,
                    "product": {
                        "id": str(ing.product.id),
                        "name": ing.product.name,
                        "image_url": ing.product.image_url,
                        "price": float(ing.product.price) if ing.product.price else 0,
                        "stock_quantity": ing.product.stock_quantity,
                        "unit": ing.product.unit
                    }
                }
            ingredient_map[product_id]["quantity"] += float(ing.quantity) * household_size
    cart_items = list(ingredient_map.values())
    return {
        "meal_plan_name": plan_name,
        "household_size": household_size,
        "items": cart_items
    }

