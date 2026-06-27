"""
AI-powered features: EazyBot shopping assistant, product description generator,
and semantic search query parser. Powered by Anthropic Claude.
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

class ChatResponse(BaseModel):
    response: str
    products: Optional[List[ProductHit]] = []
    suggestions: Optional[List[str]] = []

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


# ── AI Shopping Assistant ──────────────────────────────────────────────────────

_SYSTEM = """You are EazyBot, the AI shopping assistant for EazyFoods — a Canadian online grocery and food delivery platform specializing in African, Caribbean, and international foods.

Your role:
- Help customers find products and build shopping lists
- Suggest ingredients needed for dishes (especially African/Caribbean cuisine: jollof rice, egusi, ogbono, suya, puff puff, plantains, scotch bonnet, etc.)
- Answer questions about orders, delivery, payments with brief helpful guidance
- Be warm, friendly, and concise — 2-4 sentences per reply, or a short ingredient list
- When products are listed in context, reference them by name to make specific suggestions
- Never invent prices or product IDs

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

    # Decide whether to search products for RAG
    is_food_query = any(kw in msg_lower for kw in _FOOD_KEYWORDS)
    products: List[dict] = []
    product_context = ""

    if is_food_query:
        # Pick the best search keyword: first meaningful word from the message
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

    # Build Claude messages (cap history at last 8 turns to keep tokens low)
    messages = []
    for m in (request.conversation_history or [])[-8:]:
        messages.append({"role": m.role, "content": m.content})

    user_content = request.message + product_context
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

    # Contextual quick-reply chips
    if any(w in msg_lower for w in ('order', 'track', 'delivery', 'status')):
        chips = ["View My Orders", "Track Delivery", "Contact Support"]
    elif any(w in msg_lower for w in ('recipe', 'cook', 'ingredient')):
        chips = ["Browse Groceries", "View Recipes & Meal Plans"]
    elif any(w in msg_lower for w in ('payment', 'refund', 'charge', 'price')):
        chips = ["Contact Support", "View Order History"]
    else:
        chips = ["Browse Groceries", "View Stores", "View Recipes & Meal Plans"]

    return ChatResponse(
        response=text,
        products=[ProductHit(**p) for p in products[:4]],
        suggestions=chips,
    )


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
