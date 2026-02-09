"""
Extended marketing endpoints for audiences, AB testing, social media, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID
from app.core.database import get_db
from app.models.marketing import (
    Audience, ABTest, SocialMediaPost, Notification, AutomationWorkflow, 
    MarketingBudget, Contact, ContentLibrary
)
from app.models.customer import Customer, CustomerAddress
from app.models.order import Order
from app.api.v1.dependencies import get_current_admin
from pydantic import BaseModel
from decimal import Decimal

router = APIRouter()


# Schemas
class AudienceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    criteria: dict


class ABTestCreate(BaseModel):
    name: str
    description: Optional[str] = None
    test_type: str
    variant_a_id: Optional[str] = None
    variant_b_id: Optional[str] = None
    variant_a_name: str
    variant_b_name: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SocialMediaPostCreate(BaseModel):
    platform: str
    content: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class NotificationCreate(BaseModel):
    type: str  # sms or push
    title: str
    message: str
    scheduled_at: Optional[datetime] = None
    target_audience: Optional[dict] = None


class AutomationWorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_config: Optional[dict] = None
    actions: List[dict]
    conditions: Optional[dict] = None


class MarketingBudgetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    total_budget: Decimal
    start_date: datetime
    end_date: datetime


class ContactCreate(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    source: Optional[str] = None
    properties: Optional[dict] = None
    tags: Optional[List[str]] = None


# Audience Endpoints
@router.get("/audiences", response_model=List[dict])
async def get_audiences(
    skip: int = 0,
    limit: int = 50,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all audiences"""
    audiences = db.query(Audience).filter(
        Audience.created_by == UUID(current_admin["admin_id"])
    ).order_by(Audience.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for audience in audiences:
        # Calculate actual audience size based on criteria
        size = calculate_audience_size(audience.criteria, db)
        result.append({
            "id": str(audience.id),
            "name": audience.name,
            "description": audience.description,
            "criteria": audience.criteria,
            "size": size,
            "is_active": audience.is_active,
            "created_at": audience.created_at.isoformat(),
            "updated_at": audience.updated_at.isoformat()
        })
    
    return result


class AudiencePreviewRequest(BaseModel):
    criteria: dict


@router.post("/audiences/preview", response_model=dict)
async def preview_audience_size(
    body: AudiencePreviewRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Preview segment size without saving. Accepts same criteria as create."""
    size = calculate_audience_size(body.criteria, db)
    return {"size": size}


def _apply_rule_to_query(rule: dict, query, db: Session):
    """Apply a single rule to a Customer query. Returns filtered query."""
    prop = rule.get("property")
    op = rule.get("operator", "equals")
    val = rule.get("value")
    if prop is None or val is None:
        return query

    now = datetime.utcnow()

    # Address-based properties (join with CustomerAddress)
    if prop == "city":
        addr_subq = db.query(CustomerAddress.customer_id).filter(
            CustomerAddress.customer_id == Customer.id
        )
        if op == "equals":
            addr_subq = addr_subq.filter(func.lower(CustomerAddress.city) == str(val).lower())
        elif op == "contains":
            addr_subq = addr_subq.filter(func.lower(CustomerAddress.city).contains(str(val).lower()))
        elif op == "not_equals":
            addr_subq = addr_subq.filter(func.lower(CustomerAddress.city) != str(val).lower())
        return query.filter(Customer.id.in_(addr_subq))
    if prop == "state":
        addr_subq = db.query(CustomerAddress.customer_id).filter(
            CustomerAddress.customer_id == Customer.id
        )
        if op == "equals":
            addr_subq = addr_subq.filter(func.lower(CustomerAddress.state) == str(val).lower())
        elif op == "contains":
            addr_subq = addr_subq.filter(func.lower(CustomerAddress.state).contains(str(val).lower()))
        elif op == "not_equals":
            addr_subq = addr_subq.filter(func.lower(CustomerAddress.state) != str(val).lower())
        return query.filter(Customer.id.in_(addr_subq))
    if prop == "country":
        addr_subq = db.query(CustomerAddress.customer_id).filter(
            CustomerAddress.customer_id == Customer.id
        )
        if op == "equals":
            addr_subq = addr_subq.filter(func.lower(CustomerAddress.country) == str(val).lower())
        elif op == "contains":
            addr_subq = addr_subq.filter(func.lower(CustomerAddress.country).contains(str(val).lower()))
        elif op == "not_equals":
            addr_subq = addr_subq.filter(func.lower(CustomerAddress.country) != str(val).lower())
        return query.filter(Customer.id.in_(addr_subq))

    # Behavior: total_orders
    if prop == "total_orders":
        order_counts = db.query(Order.customer_id, func.count(Order.id).label("cnt")).filter(
            Order.customer_id.isnot(None),
            Order.status.in_(["delivered", "picked_up"])
        ).group_by(Order.customer_id).subquery()
        num_val = float(val) if val != "" else 0
        if op in ("gte", ">="):
            cust_ids = db.query(order_counts.c.customer_id).filter(order_counts.c.cnt >= num_val).all()
        elif op in ("lte", "<="):
            cust_ids = db.query(order_counts.c.customer_id).filter(order_counts.c.cnt <= num_val).all()
        elif op in ("greater_than", ">"):
            cust_ids = db.query(order_counts.c.customer_id).filter(order_counts.c.cnt > num_val).all()
        elif op in ("less_than", "<"):
            cust_ids = db.query(order_counts.c.customer_id).filter(order_counts.c.cnt < num_val).all()
        elif op in ("equals", "=="):
            cust_ids = db.query(order_counts.c.customer_id).filter(order_counts.c.cnt == num_val).all()
        else:
            return query
        ids = [r[0] for r in cust_ids]
        return query.filter(Customer.id.in_(ids)) if ids else query.filter(1 == 0)

    # Behavior: total_spent
    if prop == "total_spent":
        subq = db.query(Order.customer_id, func.sum(Order.total_amount).label("total")).filter(
            Order.customer_id.isnot(None),
            Order.status.in_(["delivered", "picked_up"])
        ).group_by(Order.customer_id).subquery()
        num_val = Decimal(str(val)) if val != "" else Decimal("0")
        if op in ("gte", ">="):
            cust_ids = db.query(subq.c.customer_id).filter(subq.c.total >= num_val).all()
        elif op in ("lte", "<="):
            cust_ids = db.query(subq.c.customer_id).filter(subq.c.total <= num_val).all()
        elif op in ("greater_than", ">"):
            cust_ids = db.query(subq.c.customer_id).filter(subq.c.total > num_val).all()
        elif op in ("less_than", "<"):
            cust_ids = db.query(subq.c.customer_id).filter(subq.c.total < num_val).all()
        elif op in ("equals", "=="):
            cust_ids = db.query(subq.c.customer_id).filter(subq.c.total == num_val).all()
        else:
            return query
        ids = [r[0] for r in cust_ids]
        return query.filter(Customer.id.in_(ids)) if ids else query.filter(1 == 0)

    # last_order_days: ordered within last N days
    if prop == "last_order_days":
        days_ago = now - timedelta(days=int(val) if val else 0)
        cust_ids = db.query(Order.customer_id).filter(
            Order.customer_id.isnot(None),
            Order.created_at >= days_ago,
            Order.status.in_(["delivered", "picked_up"])
        ).distinct().all()
        ids = [r[0] for r in cust_ids]
        return query.filter(Customer.id.in_(ids)) if ids else query.filter(1 == 0)

    # signup_days: signed up within last N days
    if prop == "signup_days":
        days_ago = now - timedelta(days=int(val) if val else 0)
        return query.filter(Customer.created_at >= days_ago)

    # has_orders: has placed at least one order
    if prop == "has_orders":
        if str(val).lower() in ("true", "1", "yes"):
            cust_ids = db.query(Order.customer_id).filter(
                Order.customer_id.isnot(None)
            ).distinct().all()
            ids = [r[0] for r in cust_ids]
            return query.filter(Customer.id.in_(ids)) if ids else query.filter(1 == 0)
        else:
            cust_ids = db.query(Order.customer_id).filter(
                Order.customer_id.isnot(None)
            ).distinct().all()
            ids = [r[0] for r in cust_ids]
            return query.filter(~Customer.id.in_(ids)) if ids else query

    return query


def calculate_audience_size(criteria: dict, db: Session) -> int:
    """Calculate audience size based on criteria.
    Supports:
    - Legacy: { min_order_value, signup_days, city, has_orders }
    - Rule-based: { match: "all"|"any", rules: [{ property, operator, value }] }
    """
    # Rule-based format
    if "rules" in criteria and isinstance(criteria.get("rules"), list):
        match_mode = criteria.get("match", "all")
        rules = [r for r in criteria["rules"] if r.get("property")]

        if not rules:
            return db.query(Customer).count()

        if match_mode == "any":
            # For "any": union of customers matching each rule
            all_ids = set()
            for rule in rules:
                q = db.query(Customer.id)
                q = _apply_rule_to_query(rule, q, db)
                ids = [r[0] for r in q.all()]
                all_ids.update(ids)
            return len(all_ids)
        else:
            # "all": intersect - apply each rule sequentially
            query = db.query(Customer)
            for rule in rules:
                query = _apply_rule_to_query(rule, query, db)
            return query.count()

    # Legacy format
    query = db.query(Customer)

    if criteria.get("min_order_value"):
        subquery = db.query(Order.customer_id).filter(
            Order.status.in_(["delivered", "picked_up"])
        ).group_by(Order.customer_id).having(
            func.sum(Order.total_amount) >= Decimal(str(criteria["min_order_value"]))
        ).subquery()
        query = query.filter(Customer.id.in_(db.query(subquery.c.customer_id)))

    if criteria.get("signup_days"):
        days_ago = datetime.utcnow() - timedelta(days=criteria["signup_days"])
        query = query.filter(Customer.created_at >= days_ago)

    if criteria.get("city"):
        addr_subq = db.query(CustomerAddress.customer_id).filter(
            CustomerAddress.customer_id == Customer.id,
            func.lower(CustomerAddress.city) == str(criteria["city"]).lower()
        )
        query = query.filter(Customer.id.in_(addr_subq))

    if criteria.get("has_orders"):
        customers_with_orders = db.query(func.distinct(Order.customer_id)).filter(
            Order.customer_id.isnot(None)
        ).subquery()
        query = query.filter(Customer.id.in_(db.query(customers_with_orders.c.customer_id)))

    return query.count()


@router.post("/audiences", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_audience(
    audience_data: AudienceCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new audience"""
    size = calculate_audience_size(audience_data.criteria, db)
    
    audience = Audience(
        name=audience_data.name,
        description=audience_data.description,
        criteria=audience_data.criteria,
        size=size,
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(audience)
    db.commit()
    db.refresh(audience)
    
    return {
        "id": str(audience.id),
        "name": audience.name,
        "size": audience.size,
        "message": "Audience created successfully"
    }


# AB Testing Endpoints
@router.get("/ab-tests", response_model=List[dict])
async def get_ab_tests(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all AB tests"""
    query = db.query(ABTest).filter(
        ABTest.created_by == UUID(current_admin["admin_id"])
    )
    
    if status_filter:
        query = query.filter(ABTest.status == status_filter)
    
    tests = query.order_by(ABTest.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(test.id),
            "name": test.name,
            "description": test.description,
            "test_type": test.test_type,
            "status": test.status,
            "variant_a_name": test.variant_a_name,
            "variant_b_name": test.variant_b_name,
            "variant_a_conversions": test.variant_a_conversions,
            "variant_b_conversions": test.variant_b_conversions,
            "variant_a_conversion_rate": float(test.variant_a_conversion_rate),
            "variant_b_conversion_rate": float(test.variant_b_conversion_rate),
            "winner": test.winner,
            "start_date": test.start_date.isoformat() if test.start_date else None,
            "end_date": test.end_date.isoformat() if test.end_date else None,
            "created_at": test.created_at.isoformat()
        }
        for test in tests
    ]


@router.post("/ab-tests", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_ab_test(
    test_data: ABTestCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new AB test"""
    test = ABTest(
        name=test_data.name,
        description=test_data.description,
        test_type=test_data.test_type,
        variant_a_id=UUID(test_data.variant_a_id) if test_data.variant_a_id else None,
        variant_b_id=UUID(test_data.variant_b_id) if test_data.variant_b_id else None,
        variant_a_name=test_data.variant_a_name,
        variant_b_name=test_data.variant_b_name,
        start_date=test_data.start_date,
        end_date=test_data.end_date,
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(test)
    db.commit()
    db.refresh(test)
    
    return {
        "id": str(test.id),
        "name": test.name,
        "message": "AB test created successfully"
    }


# Social Media Endpoints
@router.get("/social-media", response_model=List[dict])
async def get_social_media_posts(
    skip: int = 0,
    limit: int = 50,
    platform: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all social media posts"""
    query = db.query(SocialMediaPost).filter(
        SocialMediaPost.created_by == UUID(current_admin["admin_id"])
    )
    
    if platform:
        query = query.filter(SocialMediaPost.platform == platform)
    if status_filter:
        query = query.filter(SocialMediaPost.status == status_filter)
    
    posts = query.order_by(SocialMediaPost.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(post.id),
            "platform": post.platform,
            "content": post.content,
            "image_url": post.image_url,
            "video_url": post.video_url,
            "link_url": post.link_url,
            "status": post.status,
            "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "likes": post.likes,
            "shares": post.shares,
            "comments": post.comments,
            "impressions": post.impressions,
            "created_at": post.created_at.isoformat()
        }
        for post in posts
    ]


@router.post("/social-media", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_social_media_post(
    post_data: SocialMediaPostCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new social media post"""
    post = SocialMediaPost(
        platform=post_data.platform,
        content=post_data.content,
        image_url=post_data.image_url,
        video_url=post_data.video_url,
        link_url=post_data.link_url,
        scheduled_at=post_data.scheduled_at,
        status="scheduled" if post_data.scheduled_at else "draft",
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    
    return {
        "id": str(post.id),
        "message": "Social media post created successfully"
    }


# Notification Endpoints
@router.get("/notifications", response_model=List[dict])
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all notifications"""
    query = db.query(Notification).filter(
        Notification.created_by == UUID(current_admin["admin_id"])
    )
    
    if type_filter:
        query = query.filter(Notification.type == type_filter)
    if status_filter:
        query = query.filter(Notification.status == status_filter)
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(notif.id),
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "status": notif.status,
            "scheduled_at": notif.scheduled_at.isoformat() if notif.scheduled_at else None,
            "sent_at": notif.sent_at.isoformat() if notif.sent_at else None,
            "recipient_count": notif.recipient_count,
            "sent_count": notif.sent_count,
            "delivered_count": notif.delivered_count,
            "opened_count": notif.opened_count,
            "clicked_count": notif.clicked_count,
            "created_at": notif.created_at.isoformat()
        }
        for notif in notifications
    ]


@router.post("/notifications", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notif_data: NotificationCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new notification"""
    # Calculate recipient count based on target audience
    recipient_count = 0
    if notif_data.target_audience:
        # Use audience criteria to calculate recipients
        if notif_data.type == "sms":
            # For SMS, count customers with phone numbers
            recipient_count = db.query(Customer).filter(
                Customer.phone.isnot(None)
            ).count()
        else:  # push
            # For push, count all customers (simplified)
            recipient_count = db.query(Customer).count()
    else:
        # Send to all customers
        recipient_count = db.query(Customer).count()
    
    notification = Notification(
        type=notif_data.type,
        title=notif_data.title,
        message=notif_data.message,
        scheduled_at=notif_data.scheduled_at,
        target_audience=notif_data.target_audience,
        recipient_count=recipient_count,
        status="scheduled" if notif_data.scheduled_at else "draft",
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return {
        "id": str(notification.id),
        "recipient_count": notification.recipient_count,
        "message": "Notification created successfully"
    }


# Automation Workflow Endpoints
@router.get("/automation", response_model=List[dict])
async def get_automation_workflows(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all automation workflows"""
    query = db.query(AutomationWorkflow).filter(
        AutomationWorkflow.created_by == UUID(current_admin["admin_id"])
    )
    
    if status_filter:
        query = query.filter(AutomationWorkflow.status == status_filter)
    
    workflows = query.order_by(AutomationWorkflow.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(workflow.id),
            "name": workflow.name,
            "description": workflow.description,
            "status": workflow.status,
            "trigger_type": workflow.trigger_type,
            "trigger_config": workflow.trigger_config,
            "actions": workflow.actions,
            "conditions": workflow.conditions,
            "active_instances": workflow.active_instances,
            "total_executions": workflow.total_executions,
            "created_at": workflow.created_at.isoformat(),
            "updated_at": workflow.updated_at.isoformat()
        }
        for workflow in workflows
    ]


@router.post("/automation", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_automation_workflow(
    workflow_data: AutomationWorkflowCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new automation workflow"""
    workflow = AutomationWorkflow(
        name=workflow_data.name,
        description=workflow_data.description,
        trigger_type=workflow_data.trigger_type,
        trigger_config=workflow_data.trigger_config,
        actions=workflow_data.actions,
        conditions=workflow_data.conditions,
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    
    return {
        "id": str(workflow.id),
        "name": workflow.name,
        "message": "Automation workflow created successfully"
    }


@router.put("/automation/{workflow_id}/activate", response_model=dict)
async def activate_workflow(
    workflow_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activate an automation workflow"""
    workflow = db.query(AutomationWorkflow).filter(
        AutomationWorkflow.id == UUID(workflow_id),
        AutomationWorkflow.created_by == UUID(current_admin["admin_id"])
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.status = "active"
    workflow.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Workflow activated successfully"}


@router.put("/automation/{workflow_id}/pause", response_model=dict)
async def pause_workflow(
    workflow_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Pause an automation workflow"""
    workflow = db.query(AutomationWorkflow).filter(
        AutomationWorkflow.id == UUID(workflow_id),
        AutomationWorkflow.created_by == UUID(current_admin["admin_id"])
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.status = "paused"
    workflow.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Workflow paused successfully"}


# Budget Endpoints
@router.get("/budgets", response_model=List[dict])
async def get_budgets(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all marketing budgets"""
    query = db.query(MarketingBudget).filter(
        MarketingBudget.created_by == UUID(current_admin["admin_id"])
    )
    
    if status_filter:
        query = query.filter(MarketingBudget.status == status_filter)
    
    budgets = query.order_by(MarketingBudget.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for budget in budgets:
        # Calculate remaining budget
        remaining = budget.total_budget - budget.spent
        result.append({
            "id": str(budget.id),
            "name": budget.name,
            "description": budget.description,
            "total_budget": float(budget.total_budget),
            "spent": float(budget.spent),
            "remaining": float(remaining),
            "start_date": budget.start_date.isoformat(),
            "end_date": budget.end_date.isoformat(),
            "status": budget.status,
            "created_at": budget.created_at.isoformat()
        })
    
    return result


@router.post("/budgets", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget_data: MarketingBudgetCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new marketing budget"""
    budget = MarketingBudget(
        name=budget_data.name,
        description=budget_data.description,
        total_budget=budget_data.total_budget,
        start_date=budget_data.start_date,
        end_date=budget_data.end_date,
        remaining=budget_data.total_budget,
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(budget)
    db.commit()
    db.refresh(budget)
    
    return {
        "id": str(budget.id),
        "name": budget.name,
        "message": "Budget created successfully"
    }


# Contact/Lead Management Endpoints
@router.get("/contacts", response_model=List[dict])
async def get_contacts(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    lead_status: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all contacts/leads"""
    query = db.query(Contact)
    
    if search:
        query = query.filter(
            or_(
                Contact.email.ilike(f"%{search}%"),
                Contact.first_name.ilike(f"%{search}%"),
                Contact.last_name.ilike(f"%{search}%")
            )
        )
    
    if lead_status:
        query = query.filter(Contact.lead_status == lead_status)
    
    contacts = query.order_by(Contact.lead_score.desc(), Contact.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(contact.id),
            "email": contact.email,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "phone": contact.phone,
            "company": contact.company,
            "job_title": contact.job_title,
            "lead_score": contact.lead_score,
            "lead_status": contact.lead_status,
            "properties": contact.properties,
            "tags": contact.tags,
            "source": contact.source,
            "last_contacted_at": contact.last_contacted_at.isoformat() if contact.last_contacted_at else None,
            "created_at": contact.created_at.isoformat()
        }
        for contact in contacts
    ]


@router.post("/contacts", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact_data: ContactCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new contact/lead"""
    # Check if contact already exists
    existing = db.query(Contact).filter(Contact.email == contact_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    # Check if customer exists and link
    customer = db.query(Customer).filter(Customer.email == contact_data.email).first()
    customer_id = customer.id if customer else None
    
    contact = Contact(
        email=contact_data.email,
        first_name=contact_data.first_name,
        last_name=contact_data.last_name,
        phone=contact_data.phone,
        company=contact_data.company,
        job_title=contact_data.job_title,
        source=contact_data.source,
        properties=contact_data.properties,
        tags=contact_data.tags,
        customer_id=customer_id,
        created_by=UUID(current_admin["admin_id"])
    )
    
    # Calculate initial lead score
    contact.lead_score = calculate_lead_score(contact, db)
    
    db.add(contact)
    db.commit()
    db.refresh(contact)
    
    return {
        "id": str(contact.id),
        "email": contact.email,
        "lead_score": contact.lead_score,
        "message": "Contact created successfully"
    }


def calculate_lead_score(contact: Contact, db: Session) -> int:
    """Calculate lead score based on various factors"""
    score = 0
    
    # Base score for having email
    if contact.email:
        score += 10
    
    # Score for having phone
    if contact.phone:
        score += 5
    
    # Score for company info
    if contact.company:
        score += 10
    
    # Score if linked to customer
    if contact.customer_id:
        score += 20
        
        # Check order history
        order_count = db.query(Order).filter(
            Order.customer_id == contact.customer_id,
            Order.status.in_(["delivered", "picked_up"])
        ).count()
        
        if order_count > 0:
            score += 30
        if order_count > 5:
            score += 20
    
    # Score for engagement
    if contact.last_email_opened_at:
        score += 10
    if contact.last_email_clicked_at:
        score += 15
    
    return min(score, 100)  # Cap at 100


# Content Library Endpoints
@router.get("/content-library", response_model=List[dict])
async def get_content_library(
    skip: int = 0,
    limit: int = 50,
    content_type: Optional[str] = None,
    category: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all content library items"""
    query = db.query(ContentLibrary)
    
    if content_type:
        query = query.filter(ContentLibrary.content_type == content_type)
    if category:
        query = query.filter(ContentLibrary.category == category)
    
    items = query.order_by(ContentLibrary.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(item.id),
            "name": item.name,
            "description": item.description,
            "content_type": item.content_type,
            "file_url": item.file_url,
            "thumbnail_url": item.thumbnail_url,
            "file_size": item.file_size,
            "mime_type": item.mime_type,
            "tags": item.tags,
            "category": item.category,
            "is_public": item.is_public,
            "usage_count": item.usage_count,
            "created_at": item.created_at.isoformat()
        }
        for item in items
    ]


@router.post("/content-library", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_content_library_item(
    name: str,
    description: Optional[str] = None,
    content_type: str = Query(...),
    file_url: str = Query(...),
    thumbnail_url: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new content library item"""
    item = ContentLibrary(
        name=name,
        description=description,
        content_type=content_type,
        file_url=file_url,
        thumbnail_url=thumbnail_url,
        category=category,
        tags=tags,
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    return {
        "id": str(item.id),
        "name": item.name,
        "message": "Content library item created successfully"
    }

