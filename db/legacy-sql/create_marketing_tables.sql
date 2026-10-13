-- Migration: Create marketing tables for campaigns, ads, and email marketing

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    budget DECIMAL(10, 2),
    spent DECIMAL(10, 2) DEFAULT 0.0,
    target_audience JSONB,
    created_by UUID REFERENCES admin_users(id),
    vendor_id UUID REFERENCES vendors(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketing Ads
CREATE TABLE IF NOT EXISTS marketing_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES marketing_campaigns(id),
    name VARCHAR(200) NOT NULL,
    ad_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    approval_status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID REFERENCES admin_users(id),
    approved_at TIMESTAMP,
    title VARCHAR(200),
    description TEXT,
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    cta_text VARCHAR(50),
    cta_link VARCHAR(500),
    design_data JSONB,
    placement VARCHAR(50),
    priority INTEGER DEFAULT 0,
    target_audience JSONB,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    ctr DECIMAL(5, 2) DEFAULT 0.0,
    vendor_id UUID REFERENCES vendors(id),
    created_by UUID,
    created_by_type VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Campaigns
CREATE TABLE IF NOT EXISTS marketing_email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES marketing_campaigns(id),
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    from_name VARCHAR(100),
    from_email VARCHAR(200),
    html_content TEXT,
    text_content TEXT,
    template_id UUID,
    recipient_list JSONB,
    recipient_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES admin_users(id),
    vendor_id UUID REFERENCES vendors(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Templates
CREATE TABLE IF NOT EXISTS marketing_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    subject VARCHAR(200),
    html_content TEXT,
    text_content TEXT,
    thumbnail_url VARCHAR(500),
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad Placements
CREATE TABLE IF NOT EXISTS marketing_ad_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES marketing_ads(id) NOT NULL,
    placement_location VARCHAR(50) NOT NULL,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Analytics
CREATE TABLE IF NOT EXISTS marketing_campaign_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES marketing_campaigns(id) NOT NULL,
    ad_id UUID REFERENCES marketing_ads(id),
    email_campaign_id UUID REFERENCES marketing_email_campaigns(id),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0.0,
    cost DECIMAL(10, 2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_vendor ON marketing_campaigns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_marketing_ads_status ON marketing_ads(status);
CREATE INDEX IF NOT EXISTS idx_marketing_ads_approval ON marketing_ads(approval_status);
CREATE INDEX IF NOT EXISTS idx_marketing_ads_vendor ON marketing_ads(vendor_id);
CREATE INDEX IF NOT EXISTS idx_marketing_ads_placement ON marketing_ads(placement);
CREATE INDEX IF NOT EXISTS idx_marketing_ads_active ON marketing_ads(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_marketing_email_campaigns_status ON marketing_email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_ad_placements_location ON marketing_ad_placements(placement_location);
CREATE INDEX IF NOT EXISTS idx_marketing_analytics_campaign ON marketing_campaign_analytics(campaign_id, date);

