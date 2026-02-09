"""
Customer chat/AI assistant endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.api.v1.dependencies import get_current_customer
from uuid import UUID

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = []


def generate_ai_response(user_message: str, conversation_history: List[ChatMessage] = None) -> str:
    """
    Simple AI response generator (can be replaced with OpenAI, Anthropic, etc.)
    This is a rule-based system that can be enhanced with actual AI APIs.
    """
    message_lower = user_message.lower()
    
    # Order-related queries
    if any(word in message_lower for word in ['order', 'track', 'delivery', 'status']):
        return "To track your order, please visit the Orders page in your account. You'll see all your orders with their current status. For specific delivery questions, you can contact the vendor directly through their store page."
    
    # Payment/Refund queries
    if any(word in message_lower for word in ['payment', 'refund', 'money', 'charge', 'billing']):
        return "For payment and refund inquiries, please contact our support team. You can reach us at support@eazyfoods.com or create a support ticket through your account. We typically process refunds within 5-7 business days."
    
    # Product/Food queries
    if any(word in message_lower for word in ['product', 'food', 'menu', 'item', 'dish', 'recipe']):
        return "You can browse our products by visiting the Products page or searching for specific items. You can filter by category, region, or vendor. Each product page shows detailed information including ingredients, pricing, and vendor details."
    
    # Delivery/Shipping queries
    if any(word in message_lower for word in ['delivery', 'shipping', 'time', 'when', 'arrive']):
        return "Delivery times vary by vendor and location. You can check estimated delivery times on each product page. Most vendors offer same-day or next-day delivery. For specific delivery questions, please contact the vendor directly."
    
    # Account/Profile queries
    if any(word in message_lower for word in ['account', 'profile', 'settings', 'password', 'email']):
        return "You can manage your account settings, addresses, and preferences in the Profile section. If you need to change your password or update your email, you can do so from there."
    
    # Store/Vendor queries
    if any(word in message_lower for word in ['store', 'vendor', 'restaurant', 'shop']):
        return "You can browse stores by visiting the Stores page. You can filter by region, search by name, or find nearby stores. Each store page shows their menu, operating hours, and contact information."
    
    # General help
    if any(word in message_lower for word in ['help', 'support', 'assistance', 'problem', 'issue']):
        return "I'm here to help! You can ask me about orders, products, delivery, payments, or anything else related to EAZyfoods. For urgent issues, please contact our support team at support@eazyfoods.com or use the support section in your account."
    
    # Greetings
    if any(word in message_lower for word in ['hello', 'hi', 'hey', 'greetings']):
        return "Hello! Welcome to EAZyfoods. I'm here to help you with orders, products, delivery, payments, or any questions you might have. How can I assist you today?"
    
    # Thanks
    if any(word in message_lower for word in ['thank', 'thanks', 'appreciate']):
        return "You're welcome! Is there anything else I can help you with today?"
    
    # Default response
    return f"I understand you're asking about: {user_message}. I can help you with orders, products, delivery, payments, stores, and account settings. Could you provide more details about what you need help with? For specific issues, you can also contact our support team at support@eazyfoods.com."


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_request: ChatRequest,
    current_customer: Optional[dict] = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """
    Chat with AI assistant
    Works for both authenticated and unauthenticated users
    """
    try:
        # Generate AI response
        response_text = generate_ai_response(
            chat_request.message,
            chat_request.conversation_history or []
        )
        
        # Generate helpful suggestions based on the query
        suggestions = []
        message_lower = chat_request.message.lower()
        
        if any(word in message_lower for word in ['order', 'track']):
            suggestions = ["View My Orders", "Contact Support", "Track Delivery"]
        elif any(word in message_lower for word in ['product', 'food', 'menu']):
            suggestions = ["Browse Products", "Search Stores", "View Categories"]
        elif any(word in message_lower for word in ['delivery', 'shipping']):
            suggestions = ["Check Delivery Times", "View Store Hours", "Contact Vendor"]
        elif any(word in message_lower for word in ['payment', 'refund']):
            suggestions = ["Contact Support", "View Order History", "Check Account"]
        else:
            suggestions = ["Browse Products", "View Stores", "Get Help"]
        
        return ChatResponse(
            response=response_text,
            suggestions=suggestions
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat request: {str(e)}"
        )

