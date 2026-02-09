"""
Marketing models for campaigns, ads, and email marketing
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, DECIMAL, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Campaign(Base):
    __tablename__ = "marketing_campaigns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    campaign_type = Column(String(50), nullable=False)  # email, display_ad, social, sms, push
    status = Column(String(20), default="draft")  # draft, scheduled, active, paused, completed, cancelled
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    budget = Column(DECIMAL(10, 2))
    spent = Column(DECIMAL(10, 2), default=0.0)
    target_audience = Column(JSON)  # Audience filters (location, demographics, etc.)
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)  # Admin or vendor
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)  # If vendor campaign
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Ad(Base):
    __tablename__ = "marketing_ads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("marketing_campaigns.id"), nullable=True)
    name = Column(String(200), nullable=False)
    ad_type = Column(String(50), nullable=False)  # banner, sidebar, popup, carousel, video, native
    status = Column(String(20), default="pending")  # pending, approved, rejected, active, paused, expired
    approval_status = Column(String(20), default="pending")  # pending, approved, rejected (for vendor ads)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    approved_at = Column(DateTime)
    
    # Ad content
    title = Column(String(200))
    description = Column(Text)
    image_url = Column(String(500))
    video_url = Column(String(500))
    cta_text = Column(String(50))  # Call to action text
    cta_link = Column(String(500))  # Call to action link
    design_data = Column(JSON)  # Store design settings (colors, fonts, layout)
    
    # Targeting
    placement = Column(String(50))  # home, products, cart, checkout, stores, etc.
    priority = Column(Integer, default=0)  # Higher priority ads show first
    target_audience = Column(JSON)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    # Performance
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    ctr = Column(DECIMAL(5, 2), default=0.0)  # Click-through rate
    
    # Slideshow settings (for banner ads)
    slideshow_duration = Column(Integer, default=5)  # Duration in seconds (5, 7, etc.)
    slideshow_enabled = Column(Boolean, default=True)  # Whether to include in slideshow
    transition_style = Column(String(50), default='fade')  # fade, slide, none
    
    # Vendor ads
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)
    # Chef ads
    chef_id = Column(UUID(as_uuid=True), ForeignKey("chefs.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=True)  # Admin, vendor user ID, or chef ID
    created_by_type = Column(String(20), default="admin")  # admin, vendor, or chef
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailCampaign(Base):
    __tablename__ = "marketing_email_campaigns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("marketing_campaigns.id"), nullable=True)
    name = Column(String(200), nullable=False)
    subject = Column(String(200), nullable=False)
    from_name = Column(String(100))
    from_email = Column(String(200))
    
    # Email content
    html_content = Column(Text)
    text_content = Column(Text)
    template_id = Column(UUID(as_uuid=True), nullable=True)  # Reference to email template
    
    # Recipients
    recipient_list = Column(JSON)  # List of customer IDs or segment criteria
    recipient_count = Column(Integer, default=0)
    
    # Status
    status = Column(String(20), default="draft")  # draft, scheduled, sending, sent, cancelled
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    
    # Performance
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    opened_count = Column(Integer, default=0)
    clicked_count = Column(Integer, default=0)
    bounced_count = Column(Integer, default=0)
    unsubscribed_count = Column(Integer, default=0)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailTemplate(Base):
    __tablename__ = "marketing_email_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    category = Column(String(50))  # promotional, transactional, newsletter, etc.
    subject = Column(String(200))
    html_content = Column(Text)
    text_content = Column(Text)
    thumbnail_url = Column(String(500))
    is_public = Column(Boolean, default=False)  # Can vendors use this template
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdPlacement(Base):
    __tablename__ = "marketing_ad_placements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ad_id = Column(UUID(as_uuid=True), ForeignKey("marketing_ads.id"), nullable=False)
    placement_location = Column(String(50), nullable=False)  # home_banner, sidebar, product_page, etc.
    position = Column(Integer, default=0)  # Order in placement
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CampaignAnalytics(Base):
    __tablename__ = "marketing_campaign_analytics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("marketing_campaigns.id"), nullable=False)
    ad_id = Column(UUID(as_uuid=True), ForeignKey("marketing_ads.id"), nullable=True)
    email_campaign_id = Column(UUID(as_uuid=True), ForeignKey("marketing_email_campaigns.id"), nullable=True)
    
    date = Column(DateTime, default=datetime.utcnow)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    revenue = Column(DECIMAL(10, 2), default=0.0)
    cost = Column(DECIMAL(10, 2), default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class Audience(Base):
    __tablename__ = "marketing_audiences"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    criteria = Column(JSON)  # Segmentation criteria (min_order_value, city, signup_days, etc.)
    size = Column(Integer, default=0)  # Calculated audience size
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ABTest(Base):
    __tablename__ = "marketing_ab_tests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    test_type = Column(String(50), nullable=False)  # ad, email, landing_page, subject_line
    status = Column(String(20), default="draft")  # draft, running, paused, completed
    
    variant_a_id = Column(UUID(as_uuid=True), nullable=True)  # Reference to ad/email/etc
    variant_b_id = Column(UUID(as_uuid=True), nullable=True)
    variant_a_name = Column(String(100), nullable=False)
    variant_b_name = Column(String(100), nullable=False)
    
    variant_a_conversions = Column(Integer, default=0)
    variant_b_conversions = Column(Integer, default=0)
    variant_a_conversion_rate = Column(DECIMAL(5, 2), default=0.0)
    variant_b_conversion_rate = Column(DECIMAL(5, 2), default=0.0)
    
    winner = Column(String(1), nullable=True)  # A or B
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SocialMediaPost(Base):
    __tablename__ = "marketing_social_media_posts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform = Column(String(50), nullable=False)  # facebook, instagram, twitter, linkedin
    content = Column(Text, nullable=False)
    image_url = Column(String(500))
    video_url = Column(String(500))
    link_url = Column(String(500))
    
    status = Column(String(20), default="draft")  # draft, scheduled, published, failed
    scheduled_at = Column(DateTime)
    published_at = Column(DateTime)
    
    # Engagement metrics
    likes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    __tablename__ = "marketing_notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String(20), nullable=False)  # sms, push
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    status = Column(String(20), default="draft")  # draft, scheduled, sent, failed
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    
    recipient_count = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    opened_count = Column(Integer, default=0)
    clicked_count = Column(Integer, default=0)
    
    target_audience = Column(JSON)  # Audience criteria
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AutomationWorkflow(Base):
    __tablename__ = "marketing_automation_workflows"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(String(20), default="draft")  # draft, active, paused
    
    trigger_type = Column(String(50), nullable=False)  # customer_signup, cart_abandoned, order_delivered, etc.
    trigger_config = Column(JSON)  # Trigger-specific configuration
    
    actions = Column(JSON)  # Array of actions to execute
    conditions = Column(JSON)  # Conditional logic
    
    active_instances = Column(Integer, default=0)
    total_executions = Column(Integer, default=0)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MarketingBudget(Base):
    __tablename__ = "marketing_budgets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    total_budget = Column(DECIMAL(10, 2), nullable=False)
    spent = Column(DECIMAL(10, 2), default=0.0)
    remaining = Column(DECIMAL(10, 2))
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    status = Column(String(20), default="active")  # active, completed, cancelled
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Contact(Base):
    __tablename__ = "marketing_contacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(20))
    company = Column(String(200))
    job_title = Column(String(100))
    
    # Lead scoring
    lead_score = Column(Integer, default=0)
    lead_status = Column(String(50), default="new")  # new, contacted, qualified, converted, lost
    
    # Contact properties
    properties = Column(JSON)  # Custom properties
    tags = Column(JSON)  # Tags for segmentation
    
    # Engagement
    last_contacted_at = Column(DateTime)
    last_email_opened_at = Column(DateTime)
    last_email_clicked_at = Column(DateTime)
    
    # Source tracking
    source = Column(String(100))  # website, referral, social, etc.
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)  # Link to customer if exists
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ContentLibrary(Base):
    __tablename__ = "marketing_content_library"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    content_type = Column(String(50), nullable=False)  # image, video, document, template, banner
    
    file_url = Column(String(500))
    thumbnail_url = Column(String(500))
    file_size = Column(Integer)  # in bytes
    mime_type = Column(String(100))
    
    tags = Column(JSON)
    category = Column(String(100))
    is_public = Column(Boolean, default=False)
    
    usage_count = Column(Integer, default=0)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

