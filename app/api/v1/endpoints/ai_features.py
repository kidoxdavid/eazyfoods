"""
AI-powered features: EazyBot shopping assistant, product description generator,
semantic search query parser, and AI meal plan builder. Powered by Anthropic Claude.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any
from app.core.database import get_db
from app.core.config import settings
from app.api.v1.dependencies import get_current_vendor, get_optional_customer

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []

class ProductHit(BaseModel):
    id: str
    name: str
    price: float
    image_url: Optional[str] = ""
    description: Optional[str] = ""

# Meal plan schemas — match the marketing portal variables exactly
class MealPlanMealItem(BaseModel):
    recipe_id: str
    recipe_name: str
    image_url: Optional[str] = ""
    meal_type: str          # breakfast | lunch | dinner
    day_number: int         # 1-7 (week) / 1-30 (month) / 1 (day)
    order: int = 0

class MealPlanDayOut(BaseModel):
    day_number: int
    label: str              # "Monday", "Christmas Eve", "Day 1", etc.
    meals: List[MealPlanMealItem]

class MealPlanAIResponse(BaseModel):
    name: str
    description: str
    plan_type: str          # one_day | one_week | one_month
    day_count: int
    days: List[MealPlanDayOut]
    # Flat list for add-to-cart-from-recipes call
    meals: List[MealPlanMealItem]

class MealPlanAIRequest(BaseModel):
    request: str            # natural language e.g. "weekend plan for 4 people"
    household_size: int = 2
    plan_type: Optional[str] = None  # override if specified

class ChatResponse(BaseModel):
    response: str
    products: Optional[List[ProductHit]] = []
    suggestions: Optional[List[str]] = []
    meal_plan: Optional[MealPlanAIResponse] = None

class DescriptionRequest(BaseModel):
    name: str
    category: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None

class DescriptionResponse(BaseModel):
    description: str

class SemanticSearchRequest(BaseModel):
    query: str

class SemanticSearchResponse(BaseModel):
    search_term: str
    filters: Optional[dict] = {}


# ── Claude helper ──────────────────────────────────────────────────────────────

def _claude():
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured. Set ANTHROPIC_API_KEY.")
    try:
        import anthropic
        return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    except ImportError:
        raise HTTPException(status_code=503, detail="anthropic package not installed on server.")


# ── Product search for RAG context ────────────────────────────────────────────

def _search_products(db: Session, query: str, limit: int = 6) -> List[dict]:
    """Search products by name/description to provide context to Claude."""
    try:
        from app.models.product import Product
        from sqlalchemy import or_
        rows = (
            db.query(Product)
            .filter(
                Product.status == "active",
                or_(
                    Product.name.ilike(f"%{query}%"),
                    Product.description.ilike(f"%{query}%"),
                )
            )
            .limit(limit)
            .all()
        )
        return [
            {
                "id": str(r.id),
                "name": r.name,
                "price": float(r.price) if r.price else 0.0,
                "image_url": r.image_url or "",
                "description": (r.description or "")[:100],
            }
            for r in rows
        ]
    except Exception:
        return []


# ── Recipe fetcher for meal plan generation ───────────────────────────────────

def _get_recipes(db: Session) -> dict:
    """
    Fetch active recipes from the DB, grouped by meal_type.
    Returns {"breakfast": [...], "lunch": [...], "dinner": [...]}.
    Each recipe is: { id, name, cuisine_type, african_region, difficulty, description }
    """
    try:
        from app.models.recipe import Recipe
        rows = (
            db.query(Recipe)
            .filter(Recipe.is_active == True)
            .order_by(Recipe.is_featured.desc(), Recipe.sort_order.asc())
            .limit(120)   # Cap to avoid huge prompts
            .all()
        )
        grouped: dict = {"breakfast": [], "lunch": [], "dinner": []}
        for r in rows:
            mt = (r.meal_type or "").lower()
            if mt not in grouped:
                continue
            grouped[mt].append({
                "id": str(r.id),
                "name": r.name,
                "cuisine_type": r.cuisine_type or "",
                "african_region": r.african_region or "",
                "difficulty": r.difficulty or "",
                "description": (r.description or "")[:80],
                "image_url": r.image_url or "",
            })
        return grouped
    except Exception:
        return {"breakfast": [], "lunch": [], "dinner": []}


# ── Meal plan generator ────────────────────────────────────────────────────────

def _infer_plan_params(request: str) -> tuple[str, int]:
    """
    Infer (plan_type, day_count) from the user's natural language request.
    Returns e.g. ("one_week", 7) or ("one_day", 2).
    """
    r = request.lower()
    if any(w in r for w in ('month', 'monthly', '30 day', '30-day')):
        return "one_month", 7   # show 7-day preview for monthly in chat
    if any(w in r for w in ('week', 'weekly', '7 day', '7-day', 'weekday', 'workweek')):
        return "one_week", 7
    if any(w in r for w in ('weekend', '2 day', 'two day', 'couple of day')):
        return "one_week", 2
    if any(w in r for w in ('3 day', 'three day', 'long weekend', 'christmas', 'xmas', 'new year', 'eid', 'kwanzaa', 'holiday')):
        return "one_week", 3
    if any(w in r for w in ('today', 'tonight', '1 day', 'one day', 'daily')):
        return "one_day", 1
    # Default to 3-day plan if no clear signal
    return "one_week", 3


async def _generate_meal_plan(
    db: Session,
    request_text: str,
    plan_type: Optional[str] = None,
    household_size: int = 2,
) -> Optional[MealPlanAIResponse]:
    """
    Use Claude to build a meal plan from actual DB recipes.
    Returns None if no recipes are available or on error.
    """
    if not settings.ANTHROPIC_API_KEY:
        return None

    recipes = _get_recipes(db)
    total_recipes = sum(len(v) for v in recipes.values())
    if total_recipes == 0:
        return None

    inferred_type, day_count = _infer_plan_params(request_text)
    final_plan_type = plan_type or inferred_type

    # Format recipe lists for the prompt (id|name|cuisine|difficulty)
    def fmt(lst):
        if not lst:
            return "  (none available)"
        return "\n".join(f"  {r['id']}|{r['name']}|{r['cuisine_type']}|{r['difficulty']}" for r in lst[:30])

    day_labels_hint = ""
    if "christmas" in request_text.lower() or "xmas" in request_text.lower():
        day_labels_hint = 'Label days: "Christmas Eve", "Christmas Day", "Boxing Day" etc.'
    elif "new year" in request_text.lower():
        day_labels_hint = 'Label days: "New Year\'s Eve", "New Year\'s Day", etc.'
    elif "eid" in request_text.lower():
        day_labels_hint = 'Label days: "Eid Day 1", "Eid Day 2", etc.'
    elif "weekend" in request_text.lower():
        day_labels_hint = 'Label days: "Saturday", "Sunday".'
    elif "week" in request_text.lower():
        day_labels_hint = 'Label days: "Monday", "Tuesday", ... "Sunday".'
    else:
        day_labels_hint = 'Label days: "Day 1", "Day 2", etc.'

    prompt = f"""You are building a meal plan for a customer of EazyFoods, an African/Caribbean grocery platform in Canada.

Customer request: "{request_text}"
Plan: {day_count} day(s), household size: {household_size} people
{day_labels_hint}

Available recipes (format: id|name|cuisine|difficulty):

BREAKFAST OPTIONS:
{fmt(recipes['breakfast'])}

LUNCH OPTIONS:
{fmt(recipes['lunch'])}

DINNER OPTIONS:
{fmt(recipes['dinner'])}

Generate a meal plan as a single JSON object (no markdown, no explanation):
{{
  "name": "...",
  "description": "...",
  "plan_type": "{final_plan_type}",
  "day_count": {day_count},
  "days": [
    {{
      "day_number": 1,
      "label": "...",
      "meals": [
        {{"recipe_id": "...", "recipe_name": "...", "image_url": "", "meal_type": "breakfast", "day_number": 1, "order": 0}},
        {{"recipe_id": "...", "recipe_name": "...", "image_url": "", "meal_type": "lunch",     "day_number": 1, "order": 0}},
        {{"recipe_id": "...", "recipe_name": "...", "image_url": "", "meal_type": "dinner",    "day_number": 1, "order": 0}}
      ]
    }}
  ]
}}

Rules:
- ONLY use recipe_ids that appear in the lists above — do not invent IDs
- Each meal slot must have exactly one recipe
- If a meal_type has no options, omit that slot from the day rather than guessing
- Vary cuisine each day where possible
- Match the occasion or theme to the dish choices (e.g. Christmas → festive/celebration dishes)
- The name should be specific and appealing (e.g. "Christmas Feast Plan", "Weekend Jollof & Sides")
- Return ONLY the JSON, nothing else"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()
        s = raw.find("{")
        e = raw.rfind("}") + 1
        if s == -1 or e <= s:
            return None
        data = json.loads(raw[s:e])
    except Exception:
        return None

    # Build image_url map from DB for recipe cards
    recipe_img_map: dict = {}
    for lst in recipes.values():
        for r in lst:
            recipe_img_map[r["id"]] = r["image_url"]

    # Flatten days → meals list and validate recipe IDs
    all_valid_ids = {r["id"] for lst in recipes.values() for r in lst}
    days_out: List[MealPlanDayOut] = []
    meals_flat: List[MealPlanMealItem] = []

    for day in data.get("days", []):
        day_meals = []
        for m in day.get("meals", []):
            rid = str(m.get("recipe_id", ""))
            if rid not in all_valid_ids:
                continue   # silently drop hallucinated IDs
            img = recipe_img_map.get(rid, "")
            item = MealPlanMealItem(
                recipe_id=rid,
                recipe_name=str(m.get("recipe_name", "")),
                image_url=img,
                meal_type=str(m.get("meal_type", "dinner")),
                day_number=int(day.get("day_number", 1)),
                order=int(m.get("order", 0)),
            )
            day_meals.append(item)
            meals_flat.append(item)

        if day_meals:
            days_out.append(MealPlanDayOut(
                day_number=int(day.get("day_number", 1)),
                label=str(day.get("label", f"Day {day.get('day_number', 1)}")),
                meals=day_meals,
            ))

    if not days_out:
        return None

    return MealPlanAIResponse(
        name=str(data.get("name", "My Meal Plan")),
        description=str(data.get("description", "")),
        plan_type=str(data.get("plan_type", final_plan_type)),
        day_count=len(days_out),
        days=days_out,
        meals=meals_flat,
    )


# ── AI Shopping Assistant ──────────────────────────────────────────────────────

_SYSTEM = """You are EazyBot, the AI shopping assistant for EazyFoods — a Canadian online grocery and food delivery platform specializing in African, Caribbean, and international foods.

Your role:
- Help customers find products and build shopping lists
- Suggest ingredients needed for dishes (especially African/Caribbean cuisine: jollof rice, egusi, ogbono, suya, puff puff, plantains, scotch bonnet, etc.)
- Help customers build meal plans for any occasion (weekends, Christmas, Eid, New Year, healthy eating, etc.)
- Answer questions about orders, delivery, payments with brief helpful guidance
- Be warm, friendly, and concise — 2-4 sentences per reply, or a short ingredient list
- When products are listed in context, reference them by name to make specific suggestions
- When a meal plan is being shown to the customer, describe it briefly and encouragingly

For order/payment issues → direct to Orders page or support@eazyfoods.ca
"""

_FOOD_KEYWORDS = {
    'cook','recipe','ingredient','ingredients','buy','food','need','want',
    'jollof','egusi','ogbono','yam','plantain','fish','chicken','beef','meat',
    'vegetable','soup','stew','rice','pasta','suya','puff','pepper','spice',
    'sauce','oil','tomato','onion','garlic','crayfish','stockfish','bitter',
    'fufu','eba','pounded','ofe','banga','oha','afang','edikaikong','moi',
    'akara','scotch','habanero','curry','ginger','turmeric','thyme','bay',
    'cassava','cocoyam','melon','uziza','ugu','waterleaf',
}

_MEAL_PLAN_KEYWORDS = {
    'meal plan','meal prep','weekly plan','weekend plan','week plan','daily plan',
    'plan for the week','plan my meals','what to eat','build a plan','make a plan',
    'christmas plan','christmas meal','christmas dinner','xmas meal',
    'new year plan','new year meal','eid plan','eid meal','kwanzaa',
    'holiday plan','holiday meal','week of meals','monthly plan',
    'dinner plan','breakfast plan','lunch plan','plan my week',
    'help me plan','suggest a plan','create a plan','design a plan',
}

_SKIP_WORDS = {
    'what','how','need','want','cook','make','some','with','that','this',
    'from','also','like','have','much','many','more','your','will','just',
    'can','about','does','where','when','tell','know','give','find',
}


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_customer: Any = Depends(get_optional_customer),
):
    """EazyBot: AI-powered shopping assistant (works for guests and logged-in customers)."""
    client = _claude()

    msg_lower = request.message.lower()
    words = msg_lower.split()

    # ── Detect meal plan intent ──────────────────────────────────────────────
    is_meal_plan_request = any(kw in msg_lower for kw in _MEAL_PLAN_KEYWORDS)
    meal_plan: Optional[MealPlanAIResponse] = None

    if is_meal_plan_request:
        meal_plan = await _generate_meal_plan(db, request.message)

    # ── Product search for RAG ───────────────────────────────────────────────
    is_food_query = not is_meal_plan_request and any(kw in msg_lower for kw in _FOOD_KEYWORDS)
    products: List[dict] = []
    product_context = ""

    if is_food_query:
        search_kw = next(
            (w for w in words if len(w) > 3 and w not in _SKIP_WORDS),
            request.message[:20]
        )
        products = _search_products(db, search_kw)
        if products:
            product_context = "\n\nProducts available on EazyFoods right now:\n" + "\n".join(
                f"- {p['name']} (${p['price']:.2f})"
                for p in products
            )

    # ── Build Claude messages ────────────────────────────────────────────────
    messages = []
    for m in (request.conversation_history or [])[-8:]:
        messages.append({"role": m.role, "content": m.content})

    user_content = request.message + product_context
    if meal_plan:
        user_content += f"\n\n[System note: A meal plan called '{meal_plan.name}' ({meal_plan.day_count} days) has been generated and shown to the customer as a visual card. Briefly acknowledge it in 1-2 sentences, mention they can add all ingredients to cart, and offer to adjust if needed.]"

    messages.append({"role": "user", "content": user_content})

    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=450,
            system=_SYSTEM,
            messages=messages,
        )
        text = resp.content[0].text.strip()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI error: {exc}")

    # ── Contextual quick-reply chips ─────────────────────────────────────────
    if meal_plan:
        chips = ["Adjust the plan", "Make it vegetarian", "View all Meal Plans"]
    elif any(w in msg_lower for w in ('order', 'track', 'delivery', 'status')):
        chips = ["View My Orders", "Track Delivery", "Contact Support"]
    elif any(w in msg_lower for w in ('recipe', 'cook', 'ingredient')):
        chips = ["Browse Groceries", "View Recipes & Meal Plans"]
    elif any(w in msg_lower for w in ('payment', 'refund', 'charge', 'price')):
        chips = ["Contact Support", "View Order History"]
    else:
        chips = ["Browse Groceries", "Build a Meal Plan", "View Recipes & Meal Plans"]

    return ChatResponse(
        response=text,
        products=[ProductHit(**p) for p in products[:4]],
        suggestions=chips,
        meal_plan=meal_plan,
    )


# ── Standalone AI meal plan endpoint ──────────────────────────────────────────

@router.post("/meal-plan", response_model=MealPlanAIResponse)
async def generate_meal_plan(
    request: MealPlanAIRequest,
    db: Session = Depends(get_db),
    current_customer: Any = Depends(get_optional_customer),
):
    """
    Generate a structured meal plan from a natural language request.
    Matches the same variables used in the marketing portal (plan_type, meals[],
    day_number, meal_type, recipe_id). Works for guests and logged-in customers.
    """
    result = await _generate_meal_plan(
        db, request.request,
        plan_type=request.plan_type,
        household_size=request.household_size,
    )
    if result is None:
        recipes = _get_recipes(db)
        total = sum(len(v) for v in recipes.values())
        if total == 0:
            raise HTTPException(status_code=404, detail="No recipes available to build a meal plan. Ask an admin to add recipes first.")
        raise HTTPException(status_code=500, detail="Could not generate a meal plan. Please try again.")
    return result


# ── AI Description Generator (vendor only) ────────────────────────────────────

@router.post("/generate-description", response_model=DescriptionResponse)
async def generate_description(
    request: DescriptionRequest,
    current_vendor: Any = Depends(get_current_vendor),
):
    """Generate a compelling product description for a grocery item. Vendor-only."""
    client = _claude()

    lines = [f"Product name: {request.name}"]
    if request.category:
        lines.append(f"Category: {request.category}")
    if request.price:
        lines.append(f"Price: ${request.price:.2f}")
    if request.unit:
        lines.append(f"Sold by: {request.unit}")

    prompt = (
        "Write a short, appetizing product description for an African/Caribbean "
        "online grocery store.\n\n"
        + "\n".join(lines)
        + "\n\nRules:\n"
        "- 2-3 sentences only\n"
        "- Mention freshness, quality, or key culinary use\n"
        "- Be specific to this product, not generic\n"
        "- Output only the description text — no quotes, no labels"
    )

    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}],
        )
        return DescriptionResponse(description=resp.content[0].text.strip())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI error: {exc}")


# ── Semantic Search Query Parser ───────────────────────────────────────────────

@router.post("/search", response_model=SemanticSearchResponse)
async def semantic_search(request: SemanticSearchRequest):
    """
    Convert a natural-language shopping query into a structured product search.
    Falls back to the raw query on any error so search never breaks.
    """
    if not settings.ANTHROPIC_API_KEY:
        return SemanticSearchResponse(search_term=request.query, filters={})

    client = _claude()

    prompt = f"""Convert this grocery search query to a structured JSON search object.

Query: "{request.query}"

Respond with ONLY a JSON object (no markdown, no explanation) with:
- "search_term": 1-3 word keyword for the product database (e.g. "egusi", "scotch bonnet", "palm oil")
- "filters": optional object with any of: "discounted" (bool), "min_price" (number), "max_price" (number), "new_arrivals" (bool)

Examples:
"cheap jollof rice ingredients" → {{"search_term":"long grain rice","filters":{{"max_price":15}}}}
"fresh vegetables on sale" → {{"search_term":"vegetables","filters":{{"discounted":true}}}}
"new African spices" → {{"search_term":"African spices","filters":{{"new_arrivals":true}}}}
"egusi soup ingredients" → {{"search_term":"egusi","filters":{{}}}}"""

    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=80,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()
        s = raw.find("{")
        e = raw.rfind("}") + 1
        parsed = json.loads(raw[s:e]) if s != -1 and e > s else {}
        return SemanticSearchResponse(
            search_term=str(parsed.get("search_term", request.query)),
            filters=parsed.get("filters", {}),
        )
    except Exception:
        return SemanticSearchResponse(search_term=request.query, filters={})
