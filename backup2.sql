--
-- PostgreSQL database dump
--

\restrict 7zF6Z0zN8KYhOaldvAXvImp0Mqo1cULco8WduRw9zKJBXFXnD2ktHubOqVj6ZRL

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: check_low_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_low_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.stock_quantity <= NEW.low_stock_threshold AND NEW.track_inventory = TRUE THEN
        INSERT INTO low_stock_alerts (vendor_id, product_id, current_quantity, threshold_quantity)
        VALUES (NEW.vendor_id, NEW.id, NEW.stock_quantity, NEW.low_stock_threshold)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_order_number TEXT;
BEGIN
    new_order_number := 'EZF-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || 
                       LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN new_order_number;
END;
$$;


--
-- Name: generate_payout_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_payout_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_payout_number TEXT;
BEGIN
    new_payout_number := 'PAY-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || 
                        LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN new_payout_number;
END;
$$;


--
-- Name: update_delivery_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_delivery_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_driver_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_driver_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_recipe_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_recipe_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_vendor_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vendor_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE vendors
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE vendor_id = NEW.vendor_id AND is_public = TRUE
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE vendor_id = NEW.vendor_id AND is_public = TRUE
        )
    WHERE id = NEW.vendor_id;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    role character varying(50) DEFAULT 'admin'::character varying,
    permissions jsonb,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    parent_id uuid,
    description text,
    image_url character varying(255),
    slug character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid NOT NULL,
    sender_type character varying(20) NOT NULL,
    sender_id uuid NOT NULL,
    recipient_type character varying(20) NOT NULL,
    recipient_id uuid,
    message text NOT NULL,
    is_read boolean,
    read_at timestamp without time zone,
    created_at timestamp without time zone,
    thread_id uuid
);


--
-- Name: chef_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chef_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chef_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    rating integer NOT NULL,
    title character varying(200),
    comment text,
    cuisine_quality integer,
    service_quality integer,
    value_for_money integer,
    is_public boolean DEFAULT true,
    is_verified_purchase boolean DEFAULT false,
    chef_response text,
    chef_response_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chef_reviews_cuisine_quality_check CHECK (((cuisine_quality IS NULL) OR ((cuisine_quality >= 1) AND (cuisine_quality <= 5)))),
    CONSTRAINT chef_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT chef_reviews_service_quality_check CHECK (((service_quality IS NULL) OR ((service_quality >= 1) AND (service_quality <= 5)))),
    CONSTRAINT chef_reviews_value_for_money_check CHECK (((value_for_money IS NULL) OR ((value_for_money >= 1) AND (value_for_money <= 5))))
);


--
-- Name: chefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    phone_verified boolean DEFAULT false,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    chef_name character varying(200),
    bio text,
    profile_image_url character varying(255),
    banner_image_url character varying(255),
    street_address character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100),
    postal_code character varying(20) NOT NULL,
    country character varying(100) DEFAULT 'Canada'::character varying,
    latitude numeric(10,8),
    longitude numeric(11,8),
    cuisines text[] DEFAULT '{}'::text[] NOT NULL,
    cuisine_description text,
    government_id_url character varying(255),
    chef_certification_url character varying(255),
    profile_image_url_verification character varying(255),
    verification_status character varying(20) DEFAULT 'pending'::character varying,
    verified_at timestamp without time zone,
    verification_notes text,
    verified_by uuid,
    is_active boolean DEFAULT true,
    is_available boolean DEFAULT true,
    service_radius_km numeric(5,2) DEFAULT 10.0,
    minimum_order_amount numeric(10,2) DEFAULT 0.00,
    service_fee numeric(10,2) DEFAULT 0.00,
    estimated_prep_time_minutes integer DEFAULT 60,
    accepts_online_payment boolean DEFAULT true,
    accepts_cash_on_delivery boolean DEFAULT true,
    social_media_links jsonb,
    website_url character varying(255),
    average_rating numeric(3,2) DEFAULT 0.0,
    total_reviews integer DEFAULT 0,
    gallery_images jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chefs_verification_status_check CHECK (((verification_status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: coupon_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_usages (
    id uuid NOT NULL,
    coupon_id uuid NOT NULL,
    order_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    discount_amount numeric(10,2) NOT NULL,
    order_total numeric(10,2) NOT NULL,
    used_at timestamp without time zone
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    discount_type character varying(20) NOT NULL,
    discount_value numeric(10,2),
    max_discount_amount numeric(10,2),
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    is_active boolean,
    usage_limit integer,
    usage_count integer,
    usage_limit_per_customer integer,
    minimum_order_amount numeric(10,2),
    minimum_items integer,
    applicable_to character varying(20),
    product_ids character varying[],
    category_ids character varying[],
    vendor_ids character varying[],
    exclude_product_ids character varying[],
    exclude_category_ids character varying[],
    first_time_customer_only boolean,
    created_by_type character varying(20),
    created_by_id uuid,
    approval_status character varying(20),
    approved_at timestamp without time zone,
    approved_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: cuisines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuisines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chef_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    cuisine_type character varying(100),
    price numeric(10,2) NOT NULL,
    price_per_person numeric(10,2),
    minimum_servings integer DEFAULT 1,
    image_url character varying(500),
    images text[],
    ingredients text[],
    allergens text[],
    spice_level character varying(20) DEFAULT 'medium'::character varying,
    prep_time_minutes integer,
    serves integer DEFAULT 1,
    is_vegetarian boolean DEFAULT false,
    is_vegan boolean DEFAULT false,
    is_gluten_free boolean DEFAULT false,
    is_halal boolean DEFAULT false,
    is_kosher boolean DEFAULT false,
    status character varying(20) DEFAULT 'active'::character varying,
    is_featured boolean DEFAULT false,
    slug character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid NOT NULL,
    type character varying(20),
    street_address character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100),
    postal_code character varying(20) NOT NULL,
    country character varying(100) DEFAULT 'United States'::character varying NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_addresses_type_check CHECK (((type)::text = ANY ((ARRAY['shipping'::character varying, 'billing'::character varying, 'both'::character varying])::text[])))
);


--
-- Name: customer_allergies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_allergies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    allergy_type character varying(100) NOT NULL,
    severity character varying(20) DEFAULT 'moderate'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_allergies_severity_check CHECK (((severity)::text = ANY ((ARRAY['mild'::character varying, 'moderate'::character varying, 'severe'::character varying])::text[])))
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    password_hash character varying(255) NOT NULL,
    is_email_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliveries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    driver_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    accepted_at timestamp without time zone,
    picked_up_at timestamp without time zone,
    delivered_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    cancellation_reason text,
    pickup_latitude numeric(10,8),
    pickup_longitude numeric(11,8),
    delivery_latitude numeric(10,8),
    delivery_longitude numeric(11,8),
    current_latitude numeric(10,8),
    current_longitude numeric(11,8),
    estimated_pickup_time timestamp without time zone,
    estimated_delivery_time timestamp without time zone,
    actual_pickup_time timestamp without time zone,
    actual_delivery_time timestamp without time zone,
    distance_km numeric(8,2),
    delivery_fee numeric(10,2) DEFAULT 0.0,
    driver_earnings numeric(10,2) DEFAULT 0.0,
    driver_notes text,
    customer_notes text,
    customer_rating integer,
    customer_feedback text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    route_polyline text,
    route_distance_km numeric(8,2),
    route_duration_seconds integer,
    current_eta_minutes integer,
    last_location_update timestamp without time zone
);


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    phone_verified boolean DEFAULT false,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    date_of_birth timestamp without time zone,
    street_address character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100),
    postal_code character varying(20) NOT NULL,
    country character varying(100) DEFAULT 'United States'::character varying,
    latitude numeric(10,8),
    longitude numeric(11,8),
    vehicle_type character varying(50),
    vehicle_make character varying(100),
    vehicle_model character varying(100),
    vehicle_year integer,
    vehicle_color character varying(50),
    license_plate character varying(50),
    driver_license_number character varying(100),
    driver_license_url character varying(255),
    vehicle_registration_url character varying(255),
    insurance_document_url character varying(255),
    profile_image_url character varying(255),
    verification_status character varying(20) DEFAULT 'pending'::character varying,
    verified_at timestamp without time zone,
    verification_notes text,
    is_active boolean DEFAULT true,
    is_available boolean DEFAULT false,
    current_location_latitude numeric(10,8),
    current_location_longitude numeric(11,8),
    last_location_update timestamp without time zone,
    total_deliveries integer DEFAULT 0,
    completed_deliveries integer DEFAULT 0,
    cancelled_deliveries integer DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0.0,
    total_ratings integer DEFAULT 0,
    total_earnings numeric(10,2) DEFAULT 0.0,
    delivery_radius_km numeric(5,2) DEFAULT 10.0,
    preferred_delivery_zones json,
    bank_account_name character varying(200),
    bank_account_number character varying(50),
    bank_routing_number character varying(50),
    bank_name character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: expiry_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expiry_alerts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    product_id uuid NOT NULL,
    expiry_date date NOT NULL,
    days_until_expiry integer NOT NULL,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: inventory_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_adjustments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    product_id uuid NOT NULL,
    adjustment_type character varying(20) NOT NULL,
    quantity_change integer NOT NULL,
    quantity_before integer NOT NULL,
    quantity_after integer NOT NULL,
    reason text,
    reference_number character varying(100),
    performed_by uuid NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    store_id uuid,
    CONSTRAINT inventory_adjustments_adjustment_type_check CHECK (((adjustment_type)::text = ANY ((ARRAY['stock_in'::character varying, 'stock_out'::character varying, 'adjustment'::character varying, 'damage'::character varying, 'expired'::character varying, 'return'::character varying])::text[])))
);


--
-- Name: low_stock_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.low_stock_alerts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    product_id uuid NOT NULL,
    current_quantity integer NOT NULL,
    threshold_quantity integer NOT NULL,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: marketing_ab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_ab_tests (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    test_type character varying(50) NOT NULL,
    status character varying(20),
    variant_a_id uuid,
    variant_b_id uuid,
    variant_a_name character varying(100) NOT NULL,
    variant_b_name character varying(100) NOT NULL,
    variant_a_conversions integer,
    variant_b_conversions integer,
    variant_a_conversion_rate numeric(5,2),
    variant_b_conversion_rate numeric(5,2),
    winner character varying(1),
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: marketing_ad_placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_ad_placements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_id uuid NOT NULL,
    placement_location character varying(50) NOT NULL,
    "position" integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: marketing_ads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_ads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    name character varying(200) NOT NULL,
    ad_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    approval_status character varying(20) DEFAULT 'pending'::character varying,
    approved_by uuid,
    approved_at timestamp without time zone,
    title character varying(200),
    description text,
    image_url character varying(500),
    video_url character varying(500),
    cta_text character varying(50),
    cta_link character varying(500),
    design_data jsonb,
    placement character varying(50),
    priority integer DEFAULT 0,
    target_audience jsonb,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    conversions integer DEFAULT 0,
    ctr numeric(5,2) DEFAULT 0.0,
    vendor_id uuid,
    created_by uuid,
    created_by_type character varying(20) DEFAULT 'admin'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    slideshow_duration integer DEFAULT 5,
    slideshow_enabled boolean DEFAULT true,
    transition_style character varying(50) DEFAULT 'fade'::character varying,
    chef_id uuid
);


--
-- Name: marketing_audiences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_audiences (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    criteria json,
    size integer,
    is_active boolean,
    created_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: marketing_automation_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_automation_workflows (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    status character varying(20),
    trigger_type character varying(50) NOT NULL,
    trigger_config json,
    actions json,
    conditions json,
    active_instances integer,
    total_executions integer,
    created_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: marketing_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_budgets (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    total_budget numeric(10,2) NOT NULL,
    spent numeric(10,2),
    remaining numeric(10,2),
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    status character varying(20),
    created_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: marketing_campaign_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_campaign_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    ad_id uuid,
    email_campaign_id uuid,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    conversions integer DEFAULT 0,
    revenue numeric(10,2) DEFAULT 0.0,
    cost numeric(10,2) DEFAULT 0.0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    campaign_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    budget numeric(10,2),
    spent numeric(10,2) DEFAULT 0.0,
    target_audience jsonb,
    created_by uuid,
    vendor_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: marketing_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_contacts (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    phone character varying(20),
    company character varying(200),
    job_title character varying(100),
    lead_score integer,
    lead_status character varying(50),
    properties json,
    tags json,
    last_contacted_at timestamp without time zone,
    last_email_opened_at timestamp without time zone,
    last_email_clicked_at timestamp without time zone,
    source character varying(100),
    customer_id uuid,
    created_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: marketing_content_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_content_library (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    content_type character varying(50) NOT NULL,
    file_url character varying(500),
    thumbnail_url character varying(500),
    file_size integer,
    mime_type character varying(100),
    tags json,
    category character varying(100),
    is_public boolean,
    usage_count integer,
    created_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: marketing_email_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_email_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    name character varying(200) NOT NULL,
    subject character varying(200) NOT NULL,
    from_name character varying(100),
    from_email character varying(200),
    html_content text,
    text_content text,
    template_id uuid,
    recipient_list jsonb,
    recipient_count integer DEFAULT 0,
    status character varying(20) DEFAULT 'draft'::character varying,
    scheduled_at timestamp without time zone,
    sent_at timestamp without time zone,
    sent_count integer DEFAULT 0,
    delivered_count integer DEFAULT 0,
    opened_count integer DEFAULT 0,
    clicked_count integer DEFAULT 0,
    bounced_count integer DEFAULT 0,
    unsubscribed_count integer DEFAULT 0,
    created_by uuid,
    vendor_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: marketing_email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(50),
    subject character varying(200),
    html_content text,
    text_content text,
    thumbnail_url character varying(500),
    is_public boolean DEFAULT false,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: marketing_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_notifications (
    id uuid NOT NULL,
    type character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    status character varying(20),
    scheduled_at timestamp without time zone,
    sent_at timestamp without time zone,
    recipient_count integer,
    sent_count integer,
    delivered_count integer,
    opened_count integer,
    clicked_count integer,
    target_audience json,
    created_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: marketing_social_media_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_social_media_posts (
    id uuid NOT NULL,
    platform character varying(50) NOT NULL,
    content text NOT NULL,
    image_url character varying(500),
    video_url character varying(500),
    link_url character varying(500),
    status character varying(20),
    scheduled_at timestamp without time zone,
    published_at timestamp without time zone,
    likes integer,
    shares integer,
    comments integer,
    impressions integer,
    created_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid,
    vendor_user_id uuid,
    type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    action_url character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name character varying(200) NOT NULL,
    product_price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    is_substituted boolean DEFAULT false,
    original_product_id uuid,
    substitution_reason text,
    is_out_of_stock boolean DEFAULT false,
    quantity_fulfilled integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cuisine_id uuid,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    changed_by uuid,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying(50) NOT NULL,
    vendor_id uuid,
    customer_id uuid,
    status character varying(20) DEFAULT 'new'::character varying,
    delivery_method character varying(20) NOT NULL,
    delivery_address_id uuid,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0,
    shipping_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    gross_sales numeric(10,2) NOT NULL,
    commission_rate numeric(5,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    net_payout numeric(10,2) NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    payment_method character varying(50),
    accepted_at timestamp without time zone,
    accepted_by uuid,
    picking_started_at timestamp without time zone,
    picking_completed_at timestamp without time zone,
    ready_at timestamp without time zone,
    picked_up_at timestamp without time zone,
    delivered_at timestamp without time zone,
    special_instructions text,
    customer_notes text,
    cancelled_at timestamp without time zone,
    cancellation_reason text,
    cancelled_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    store_id uuid,
    driver_id uuid,
    helcim_transaction_id character varying(255),
    helcim_card_token character varying(255),
    chef_id uuid,
    stripe_payment_intent_id character varying(255),
    CONSTRAINT orders_delivery_method_check CHECK (((delivery_method)::text = ANY ((ARRAY['delivery'::character varying, 'pickup'::character varying])::text[]))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'accepted'::character varying, 'picking'::character varying, 'ready'::character varying, 'picked_up'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: payout_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payout_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    payout_id uuid NOT NULL,
    order_id uuid NOT NULL,
    order_number character varying(50) NOT NULL,
    gross_sales numeric(10,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    net_payout numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payouts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    payout_number character varying(50) NOT NULL,
    gross_amount numeric(10,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    net_amount numeric(10,2) NOT NULL,
    fees numeric(10,2) DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    period_start date NOT NULL,
    period_end date NOT NULL,
    payout_method character varying(50) DEFAULT 'bank_transfer'::character varying,
    bank_account_name character varying(200),
    bank_account_number character varying(50),
    transaction_reference character varying(100),
    processed_at timestamp without time zone,
    completed_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payouts_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id uuid NOT NULL,
    setting_type character varying(50) NOT NULL,
    settings_data jsonb NOT NULL,
    updated_by uuid,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    variant_name character varying(100) NOT NULL,
    variant_value character varying(100) NOT NULL,
    price_adjustment numeric(10,2) DEFAULT 0,
    stock_quantity integer DEFAULT 0,
    sku character varying(50),
    barcode character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    sale_price numeric(10,2),
    compare_at_price numeric(10,2),
    category_id uuid,
    subcategory_id uuid,
    sku character varying(50),
    barcode character varying(50),
    vendor_sku character varying(50),
    image_url character varying(255),
    images text[],
    unit character varying(20) DEFAULT 'piece'::character varying NOT NULL,
    weight_kg numeric(8,2),
    variant_type character varying(50),
    variant_value character varying(100),
    parent_product_id uuid,
    stock_quantity integer DEFAULT 0,
    low_stock_threshold integer DEFAULT 10,
    track_inventory boolean DEFAULT true,
    expiry_date date,
    track_expiry boolean DEFAULT false,
    status character varying(20) DEFAULT 'active'::character varying,
    is_featured boolean DEFAULT false,
    slug character varying(200) NOT NULL,
    origin_country character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_newly_stocked boolean DEFAULT false,
    store_id uuid,
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'out_of_stock'::character varying, 'hidden'::character varying, 'draft'::character varying])::text[]))),
    CONSTRAINT products_stock_quantity_check CHECK ((stock_quantity >= 0))
);


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid,
    name character varying(200) NOT NULL,
    description text,
    promotion_type character varying(20) NOT NULL,
    discount_type character varying(20),
    discount_value numeric(10,2),
    minimum_order_amount numeric(10,2),
    applies_to_all_products boolean DEFAULT false,
    product_ids uuid[],
    minimum_margin_enforced boolean DEFAULT true,
    requires_approval boolean DEFAULT false,
    approval_status character varying(20) DEFAULT 'pending'::character varying,
    approved_by uuid,
    approved_at timestamp without time zone,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    chef_id uuid,
    cuisine_ids uuid[],
    CONSTRAINT promotions_approval_status_check CHECK (((approval_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT promotions_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['percentage'::character varying, 'fixed_amount'::character varying])::text[]))),
    CONSTRAINT promotions_promotion_type_check CHECK (((promotion_type)::text = ANY ((ARRAY['discount'::character varying, 'store_wide_sale'::character varying, 'featured'::character varying, 'bundle'::character varying])::text[])))
);


--
-- Name: recipe_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    is_optional boolean DEFAULT false,
    notes character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    image_url character varying(500),
    meal_type character varying(50) NOT NULL,
    cuisine_type character varying(100),
    prep_time_minutes integer,
    cook_time_minutes integer,
    servings integer DEFAULT 1,
    difficulty character varying(20),
    instructions text,
    nutrition_info jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    african_region character varying(100),
    CONSTRAINT recipes_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT recipes_meal_type_check CHECK (((meal_type)::text = ANY ((ARRAY['breakfast'::character varying, 'lunch'::character varying, 'dinner'::character varying])::text[])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    order_id uuid,
    customer_id uuid,
    rating integer NOT NULL,
    title character varying(200),
    comment text,
    is_verified_purchase boolean DEFAULT false,
    is_public boolean DEFAULT true,
    vendor_response text,
    vendor_response_at timestamp without time zone,
    responded_by uuid,
    is_reported boolean DEFAULT false,
    report_reason text,
    is_abusive boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    product_id uuid,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: sales_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    report_type character varying(20) NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_orders integer DEFAULT 0,
    total_revenue numeric(10,2) DEFAULT 0,
    total_commission numeric(10,2) DEFAULT 0,
    net_payout numeric(10,2) DEFAULT 0,
    average_order_value numeric(10,2) DEFAULT 0,
    top_products jsonb,
    average_fulfillment_time_minutes integer,
    cancellation_rate numeric(5,2),
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_reports_report_type_check CHECK (((report_type)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying, 'custom'::character varying])::text[])))
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    store_code character varying(50),
    description text,
    street_address character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100),
    postal_code character varying(20) NOT NULL,
    country character varying(100),
    latitude numeric(10,8),
    longitude numeric(11,8),
    phone character varying(20),
    email character varying(255),
    profile_image_url character varying(255),
    banner_image_url character varying(255),
    store_gallery json,
    store_tags character varying[],
    store_features json,
    specialties character varying[],
    operating_hours json,
    timezone character varying(50),
    pickup_available boolean,
    delivery_available boolean,
    delivery_radius_km numeric(5,2),
    delivery_fee numeric(10,2),
    free_delivery_threshold numeric(10,2),
    minimum_order_amount numeric(10,2),
    estimated_prep_time_minutes integer,
    payment_methods_accepted character varying[],
    accepts_online_payment boolean,
    accepts_cash_on_delivery boolean,
    return_policy text,
    cancellation_policy text,
    social_media_links json,
    is_active boolean,
    is_primary boolean,
    status character varying(20),
    average_rating numeric(3,2),
    total_reviews integer,
    region character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid,
    vendor_user_id uuid,
    subject character varying(200) NOT NULL,
    message text NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying,
    priority character varying(20) DEFAULT 'normal'::character varying,
    assigned_to character varying(100),
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_id uuid,
    message_type character varying(20) DEFAULT 'vendor'::character varying,
    CONSTRAINT support_messages_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT support_messages_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: vendor_onboarding_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_onboarding_steps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    step_name character varying(50) NOT NULL,
    completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    data jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vendor_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    role character varying(20) NOT NULL,
    is_active boolean DEFAULT true,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vendor_users_role_check CHECK (((role)::text = ANY ((ARRAY['store_owner'::character varying, 'store_manager'::character varying, 'staff'::character varying, 'finance'::character varying])::text[])))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    business_name character varying(200) NOT NULL,
    business_type character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    phone_verified boolean DEFAULT false,
    password_hash character varying(255) NOT NULL,
    street_address character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100),
    postal_code character varying(20) NOT NULL,
    country character varying(100) DEFAULT 'United States'::character varying NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    business_registration_number character varying(100),
    tax_number character varying(100),
    government_id_url character varying(255),
    business_registration_url character varying(255),
    verification_status character varying(20) DEFAULT 'pending'::character varying,
    verified_at timestamp without time zone,
    store_profile_image_url character varying(255),
    description text,
    operating_hours jsonb,
    delivery_radius_km numeric(5,2) DEFAULT 5.0,
    pickup_available boolean DEFAULT true,
    delivery_available boolean DEFAULT true,
    commission_rate numeric(5,2) DEFAULT 15.0,
    commission_agreement_accepted boolean DEFAULT false,
    commission_agreement_accepted_at timestamp without time zone,
    status character varying(20) DEFAULT 'onboarding'::character varying,
    go_live_at timestamp without time zone,
    bank_account_name character varying(200),
    bank_account_number character varying(50),
    bank_routing_number character varying(50),
    bank_name character varying(200),
    average_rating numeric(3,2) DEFAULT 0.0,
    total_reviews integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    store_gallery jsonb DEFAULT '[]'::jsonb,
    store_tags text[] DEFAULT ARRAY[]::text[],
    store_features jsonb DEFAULT '{}'::jsonb,
    minimum_order_amount numeric(10,2) DEFAULT 0.00,
    delivery_fee numeric(10,2) DEFAULT 0.00,
    free_delivery_threshold numeric(10,2) DEFAULT NULL::numeric,
    estimated_prep_time_minutes integer DEFAULT 30,
    payment_methods_accepted text[] DEFAULT ARRAY['cash'::text, 'card'::text],
    return_policy text,
    cancellation_policy text,
    social_media_links jsonb DEFAULT '{}'::jsonb,
    specialties text[],
    store_banner_image_url character varying(255),
    accepts_online_payment boolean DEFAULT true,
    accepts_cash_on_delivery boolean DEFAULT true,
    region character varying(50),
    CONSTRAINT vendors_average_rating_check CHECK (((average_rating >= (0)::numeric) AND (average_rating <= (5)::numeric))),
    CONSTRAINT vendors_status_check CHECK (((status)::text = ANY ((ARRAY['onboarding'::character varying, 'active'::character varying, 'suspended'::character varying, 'inactive'::character varying])::text[]))),
    CONSTRAINT vendors_verification_status_check CHECK (((verification_status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: COLUMN vendors.store_gallery; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.store_gallery IS 'Array of image URLs for store gallery';


--
-- Name: COLUMN vendors.store_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.store_tags IS 'Array of tags categorizing the store (e.g., african, caribbean, halal)';


--
-- Name: COLUMN vendors.store_features; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.store_features IS 'JSON object with store features (halal, kosher, organic, etc.)';


--
-- Name: COLUMN vendors.minimum_order_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.minimum_order_amount IS 'Minimum order amount required for delivery/pickup';


--
-- Name: COLUMN vendors.delivery_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.delivery_fee IS 'Standard delivery fee';


--
-- Name: COLUMN vendors.free_delivery_threshold; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.free_delivery_threshold IS 'Order amount threshold for free delivery (NULL if not applicable)';


--
-- Name: COLUMN vendors.estimated_prep_time_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.estimated_prep_time_minutes IS 'Estimated preparation time in minutes';


--
-- Name: COLUMN vendors.payment_methods_accepted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.payment_methods_accepted IS 'Array of accepted payment methods';


--
-- Name: COLUMN vendors.return_policy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.return_policy IS 'Store return policy text';


--
-- Name: COLUMN vendors.cancellation_policy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.cancellation_policy IS 'Store cancellation policy text';


--
-- Name: COLUMN vendors.social_media_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.social_media_links IS 'JSON object with social media URLs';


--
-- Name: COLUMN vendors.specialties; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.specialties IS 'Array of store specialties/cuisine types';


--
-- Name: COLUMN vendors.store_banner_image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.store_banner_image_url IS 'Banner image URL for store header display';


--
-- Name: COLUMN vendors.accepts_online_payment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.accepts_online_payment IS 'Whether store accepts online payments';


--
-- Name: COLUMN vendors.accepts_cash_on_delivery; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.accepts_cash_on_delivery IS 'Whether store accepts cash on delivery';


--
-- Data for Name: admin_activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_activity_logs (id, admin_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at) FROM stdin;
88501e8d-f46e-4806-a060-398acf265483	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	vendor_verified	vendor	7cc96e9a-bdd8-4602-a880-b690de3f2205	{"business_name": "easytest"}	\N	\N	2025-12-22 23:09:22.014681
a26b661d-5a13-4fbd-8879-8491b411ef38	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	support_ticket_updated	support	b3e56a39-b2a6-47c9-aeac-3088774e7296	{"status": "resolved", "ticket_id": "b3e56a39-b2a6-47c9-aeac-3088774e7296"}	\N	\N	2025-12-24 05:50:27.19698
53fed7f7-783c-45bc-8a51-7c99130c52b3	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	vendor_verified	vendor	353909bf-f275-45ec-bb44-54660006d528	{"vendor_name": "vibes stores"}	\N	\N	2025-12-30 00:45:20.257528
c655d874-1b3b-4467-872d-bb834e6d1265	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	order_status_updated	order	04d2b309-823a-4872-a64d-10d74945fe32	{"new_status": "cancelled", "old_status": "cancelled", "order_number": "EZF-20251222-D9A65BD6"}	\N	\N	2026-01-06 09:30:09.21082
3202cc96-c743-4d7e-90eb-0ca6d4410c1a	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	vendor_commission_updated	vendor	353909bf-f275-45ec-bb44-54660006d528	{"vendor_name": "vibes stores", "new_commission": 10, "old_commission": 10.0}	\N	\N	2026-02-06 00:36:50.43763
a72c7107-22b8-48d4-b77a-c8c329219755	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	vendor_commission_updated	vendor	7cc96e9a-bdd8-4602-a880-b690de3f2205	{"vendor_name": "easytest", "new_commission": 10, "old_commission": 10.0}	\N	\N	2026-02-06 00:36:53.956649
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_users (id, email, password_hash, first_name, last_name, role, permissions, is_active, last_login, created_at, updated_at) FROM stdin;
01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	admin@eazyfoods.com	$2b$12$rmWXyZl1Fl2MEqN1donNfe/uDz2wznJw5/w2yTLHvzPugMmYQperu	Admin	User	super_admin	\N	t	2026-02-06 02:26:36.596457	2025-12-22 15:02:38.59265	2026-02-06 02:26:36.610993
377c986a-994e-449e-bee5-ef785a323156	ebube@marketmail.com	$2b$12$M1kOTauxiYY4OVjKK5sPU.5xaWMGFHEps1XsMqodD.L2.5OauTny2	ebube	marketer	admin	{}	t	2026-02-09 17:03:18.370698	2025-12-24 22:53:21.780353	2026-02-09 17:03:18.380826
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, parent_id, description, image_url, slug, is_active, created_at, updated_at) FROM stdin;
70d6515d-f0d9-4846-ab4b-a3ad7f43691b	Grains & Cereals	\N	Traditional African grains, rice, and cereals	\N	grains-cereals	t	2025-12-21 00:53:42.351603	2025-12-21 00:53:42.351603
8268f67b-a91f-4329-ba73-6456cf6ab9e4	Spices & Seasonings	\N	Authentic African spices and seasonings	\N	spices-seasonings	t	2025-12-21 00:53:42.351603	2025-12-21 00:53:42.351603
b86a60e0-1867-4d6c-a20b-6380fbea3253	Legumes & Beans	\N	Various beans and legumes	\N	legumes-beans	t	2025-12-21 00:53:42.351603	2025-12-21 00:53:42.351603
33183fdd-b6e0-42ad-9c7c-fe0e37179ddd	Oils & Condiments	\N	Cooking oils and condiments	\N	oils-condiments	t	2025-12-21 00:53:42.351603	2025-12-21 00:53:42.351603
a69e3e9a-b16c-4258-bd08-f245d78e5342	Beverages	\N	African drinks and beverages	\N	beverages	t	2025-12-21 00:53:42.351603	2025-12-21 00:53:42.351603
6fa83ad5-af3b-4da1-80a7-f750c352a21f	Snacks & Sweets	\N	Traditional snacks and sweets	\N	snacks-sweets	t	2025-12-21 00:53:42.351603	2025-12-21 00:53:42.351603
5d92fea9-baca-4043-a880-b4c45d40e56f	Frozen Foods	\N	Frozen African food products	\N	frozen-foods	t	2025-12-21 00:53:42.351603	2025-12-21 00:53:42.351603
26965452-197a-4382-955e-2260b04505fe	Fresh Produce	\N	Fresh fruits and vegetables	\N	fresh-produce	t	2025-12-21 00:53:42.351603	2025-12-21 00:53:42.351603
55804140-e525-4d10-97ba-4c32b95f2c13	Grains & Rice	\N	\N	\N	grains-rice	t	2025-12-29 17:20:44.615694	2025-12-29 17:20:44.615694
ec63bc8b-ff1e-4e20-b195-de755c32cfbe	Snacks	\N	\N	\N	snacks	t	2025-12-29 17:20:44.651192	2025-12-29 17:20:44.651192
8fc516e9-7a7f-4e55-82eb-c361a6fefd3d	Nuts & Seeds	\N	\N	\N	nuts-seeds	t	2025-12-29 17:20:44.658036	2025-12-29 17:20:44.658036
68160b4d-f316-48ce-afaa-c85cb5775212	Vegetables	\N	\N	\N	vegetables	t	2025-12-29 17:20:44.661099	2025-12-29 17:20:44.661099
685af2a7-c4f8-492e-a98e-a6c06cfb982a	Beans & Legumes	\N	\N	\N	beans-legumes	t	2025-12-29 17:20:44.679067	2025-12-29 17:20:44.679067
20c9fe3d-881a-4360-8517-4bcbedcee173	Seasonings	\N	\N	\N	seasonings	t	2025-12-29 17:20:44.691127	2025-12-29 17:20:44.691127
27960025-9e5c-4ade-b620-0fb691868ebc	Seafood	\N	\N	\N	seafood	t	2025-12-29 17:20:44.701148	2025-12-29 17:20:44.701148
f0093908-30f9-4460-9bc7-5c9a0d7a89a3	Meat	\N	\N	\N	meat	t	2025-12-29 17:20:44.708996	2025-12-29 17:20:44.708996
9658b60d-587c-489b-9b90-69223e16946d	Bakery	\N	\N	\N	bakery	t	2025-12-29 17:20:44.721522	2025-12-29 17:20:44.721522
9b711592-bd2c-4b98-b10b-2cbd659a7d98	Fruits	\N	\N	\N	fruits	t	2025-12-29 17:20:44.749563	2025-12-29 17:20:44.749563
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_messages (id, sender_type, sender_id, recipient_type, recipient_id, message, is_read, read_at, created_at, thread_id) FROM stdin;
55f9461a-68dd-4766-a1b8-e00d1b6efc90	customer	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	admin	00000000-0000-0000-0000-000000000000	Hi guy, I'm just testing	f	\N	2026-01-04 23:39:40.022125	\N
7b85e422-37dd-404c-b02d-00bcfdda6e0d	customer	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	admin	00000000-0000-0000-0000-000000000000	anyone there	f	\N	2026-01-06 08:05:45.694306	\N
8f3bee4d-c643-442b-8f33-721bf03aa45d	vendor	353909bf-f275-45ec-bb44-54660006d528	admin	\N	Hi	t	2026-01-06 09:28:15.576193	2026-01-06 09:21:18.816095	\N
a451af00-6b95-4f40-a616-2645e158e878	vendor	353909bf-f275-45ec-bb44-54660006d528	admin	\N	Hi once again	t	2026-01-06 09:28:15.576226	2026-01-06 09:24:19.51332	\N
0fa2c4d6-9083-4549-8e59-e5f544a22156	admin	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	vendor	353909bf-f275-45ec-bb44-54660006d528	Hi, how ca I help you	t	2026-01-06 09:33:10.732916	2026-01-06 09:32:50.263604	\N
71139e57-5f53-46c5-9f8b-e5184bc1214e	vendor	353909bf-f275-45ec-bb44-54660006d528	admin	\N	My payments aren’t going through	t	2026-01-06 09:34:46.329271	2026-01-06 09:33:44.294155	\N
4aff7e04-22c9-4fdb-bd5e-4c44a0e624da	vendor	353909bf-f275-45ec-bb44-54660006d528	admin	\N	It’s been fixed, thank you	t	2026-01-07 06:18:18.873049	2026-01-06 11:46:40.995605	\N
\.


--
-- Data for Name: chef_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chef_reviews (id, chef_id, customer_id, rating, title, comment, cuisine_quality, service_quality, value_for_money, is_public, is_verified_purchase, chef_response, chef_response_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chefs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chefs (id, email, phone, phone_verified, password_hash, first_name, last_name, chef_name, bio, profile_image_url, banner_image_url, street_address, city, state, postal_code, country, latitude, longitude, cuisines, cuisine_description, government_id_url, chef_certification_url, profile_image_url_verification, verification_status, verified_at, verification_notes, verified_by, is_active, is_available, service_radius_km, minimum_order_amount, service_fee, estimated_prep_time_minutes, accepts_online_payment, accepts_cash_on_delivery, social_media_links, website_url, average_rating, total_reviews, gallery_images, created_at, updated_at) FROM stdin;
e7aad4f9-2610-4192-a0ee-5c1b32633056	dchef@cmail.com	875635765	f	$2b$12$cVZVerx3Hey/dNSCgj9cn.SZSy3IWNV0FRcpF0APw8Ql3p8n90lX2	Chef 	dave	ChefDee	i cook the best money can buy	/api/v1/uploads/chefs/f73dd654-f99d-4548-a149-647aad86ced1.JPG	/api/v1/uploads/chefs/c00e7b8f-8c3d-4334-9c4d-0e5963794a54.jpg	567 yung lane	Calgary	Alberta	t5u 6u7	Canada	\N	\N	{Togolese,Tanzanian,Algerian}		\N	\N	\N	verified	2026-01-04 02:36:21.13364	\N	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	t	t	10.00	0.00	0.00	60	t	f	{"youtube": "", "facebook": "", "instagram": ""}		0.00	0	\N	2026-01-04 02:35:27.083449	2026-02-06 00:23:58.316479
921ca14e-03cf-4083-ab37-e22de93808ed	kiki@kmail.com	9347859384	f	$2b$12$F/1.YhBChWl6A.J5eEVV3euC8Z.Fx9nyYXwPSPJV.fSQY0Z6A8oy.	kidochukwu	Ihezue	ChefKiki		/api/v1/uploads/chefs/93f34b05-2f83-46d6-b04a-31664c7aed79.JPG		Central Park	Calgary	Alberta	T2S 7Y8	Canada	\N	\N	{Ghanian}		\N	\N	\N	verified	2026-02-06 18:45:51.60736	\N	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	t	t	10.00	0.00	0.00	60	t	t	{"youtube": "", "facebook": "", "instagram": ""}		0.00	0	\N	2026-02-06 18:45:00.486549	2026-02-06 18:54:09.346696
\.


--
-- Data for Name: coupon_usages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupon_usages (id, coupon_id, order_id, customer_id, discount_amount, order_total, used_at) FROM stdin;
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupons (id, code, name, description, discount_type, discount_value, max_discount_amount, start_date, end_date, is_active, usage_limit, usage_count, usage_limit_per_customer, minimum_order_amount, minimum_items, applicable_to, product_ids, category_ids, vendor_ids, exclude_product_ids, exclude_category_ids, first_time_customer_only, created_by_type, created_by_id, approval_status, approved_at, approved_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cuisines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cuisines (id, chef_id, name, description, cuisine_type, price, price_per_person, minimum_servings, image_url, images, ingredients, allergens, spice_level, prep_time_minutes, serves, is_vegetarian, is_vegan, is_gluten_free, is_halal, is_kosher, status, is_featured, slug, created_at, updated_at) FROM stdin;
bb6a2ecc-fa93-4067-bfd2-7311278b8461	e7aad4f9-2610-4192-a0ee-5c1b32633056	Fried Rice	\N	Moroccan	34.99	\N	1	/api/v1/uploads/chefs/082e6b4d-e4bf-4da2-8ebe-c6f8134ccdbd.WEBP	\N	\N	\N	medium	180	2	f	t	f	f	f	active	f	fried-rice	2026-01-04 06:27:55.551603	2026-02-05 23:58:14.091272
0637393e-3f5e-4ae9-a820-c8cbe19a82db	e7aad4f9-2610-4192-a0ee-5c1b32633056	Isi-ewu	baked with flour	Nigerian	22.78	\N	1	/api/v1/uploads/chefs/d0600676-2a75-4867-8cb3-8e78317cc023.webp	\N	\N	{"nuts and curry"}	medium	10	1	f	t	f	f	f	active	f	isi-ewu	2026-02-05 23:57:29.621658	2026-02-06 00:09:21.16195
d7b53a63-fe50-4d60-8f53-3abd3b106f56	921ca14e-03cf-4083-ab37-e22de93808ed	Meat Pie	The pie with a difference	Botswanan	23.22	23.22	1	/api/v1/uploads/chefs/4af9457c-d795-4686-9dbc-b4cfff2171d3.jpg	{}	{}	{}	mild	12	1	f	f	f	t	f	active	f	meat-pie	2026-02-06 18:51:07.732565	2026-02-06 18:51:07.732576
\.


--
-- Data for Name: customer_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_addresses (id, customer_id, type, street_address, city, state, postal_code, country, latitude, longitude, is_default, created_at, updated_at) FROM stdin;
c3435c8f-e89f-4b40-978d-7371004fad13	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	\N	Verity Manor SW	Calgary	AB	T2Y 0T2	Canada	\N	\N	f	2026-02-05 20:55:27.181201	2026-02-05 20:55:27.181207
809efd36-0a08-4c58-808d-6929fd7c9bc0	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	\N	Verity Manor SW	Calgary	AB	T2Y 0T2	Canada	\N	\N	f	2026-02-06 01:53:55.183012	2026-02-06 01:53:55.183026
\.


--
-- Data for Name: customer_allergies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_allergies (id, customer_id, allergy_type, severity, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, email, first_name, last_name, phone, password_hash, is_email_verified, created_at, updated_at) FROM stdin;
3db6156e-97b3-4cf5-8c6c-2af032257531	kido@testermail.com	kidochukwu	ihezue		$2b$12$JDlGtJR/B2LNyLxitzX/XeSDzPsanRHbBDyGly3pat/T/QDeiLVYe	f	2025-12-21 09:30:29.112924	2025-12-21 09:32:48.800197
abfd8e67-e844-4122-a519-835d8121eea2	Kidochukwu02@gmail.com	Kido	Sharon		$2b$12$ABuyBeujtxJNjR1QPQnyYuIHsoR/c4GBcODm..7KpZBL9vj30keWy	f	2025-12-24 07:36:44.05062	2025-12-24 07:36:44.050628
defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	bubus@bmail.com	Bubus	Testing	8536214458	$2b$12$gbF702voSujVJUe.NCrHXe5tAGrBBBj5cZE/DZgArdlMvOdwlck0O	f	2025-12-30 04:27:29.590474	2025-12-30 04:27:29.590486
\.


--
-- Data for Name: deliveries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.deliveries (id, order_id, driver_id, status, accepted_at, picked_up_at, delivered_at, cancelled_at, cancellation_reason, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude, current_latitude, current_longitude, estimated_pickup_time, estimated_delivery_time, actual_pickup_time, actual_delivery_time, distance_km, delivery_fee, driver_earnings, driver_notes, customer_notes, customer_rating, customer_feedback, created_at, updated_at, route_polyline, route_distance_km, route_duration_seconds, current_eta_minutes, last_location_update) FROM stdin;
2712fb12-5a31-4bd1-8f86-d62aa5f8cb72	4d3e9cda-c552-4872-b9f2-54117cb435c4	cfebc011-73a1-42aa-9744-ef64edc6325a	delivered	2026-02-06 03:12:55.86581	2026-02-06 03:14:29.541839	2026-02-06 03:15:20.459831	\N	\N	51.04470000	-114.07190000	\N	\N	\N	\N	2026-02-05 20:27:55.819	2026-02-05 20:57:55.819	2026-02-06 03:14:29.541848	2026-02-06 03:15:20.459866	\N	5.00	4.00	\N	\N	\N	\N	2026-02-06 03:12:55.908768	2026-02-05 20:15:20.453407	\N	\N	\N	\N	\N
\.


--
-- Data for Name: drivers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.drivers (id, email, phone, phone_verified, password_hash, first_name, last_name, date_of_birth, street_address, city, state, postal_code, country, latitude, longitude, vehicle_type, vehicle_make, vehicle_model, vehicle_year, vehicle_color, license_plate, driver_license_number, driver_license_url, vehicle_registration_url, insurance_document_url, profile_image_url, verification_status, verified_at, verification_notes, is_active, is_available, current_location_latitude, current_location_longitude, last_location_update, total_deliveries, completed_deliveries, cancelled_deliveries, average_rating, total_ratings, total_earnings, delivery_radius_km, preferred_delivery_zones, bank_account_name, bank_account_number, bank_routing_number, bank_name, created_at, updated_at) FROM stdin;
cfebc011-73a1-42aa-9744-ef64edc6325a	ebube@testedmail.com	2838848629	f	$2b$12$DCnJcb6S4MtWXQdH2Lskqen24D6r8gCEmVpw309HiFNpZqDNMDCtS	Ebube	tested	\N	345 turning point lane	Calgary	Al	t4o 8d7	United States	\N	\N	car	Nissan	Rogue	2006	black	gh78ol	sfdf686uk6uk768	\N	\N	\N	\N	approved	2025-12-24 09:44:08.928036	you can start ASAP	t	t	\N	\N	\N	1	1	0	0.00	0	4.00	10.00	["Zone 7 \\u2014 Southwest Hub"]	\N	\N	\N	\N	2025-12-24 09:42:42.141226	2026-02-05 20:15:20.453407
\.


--
-- Data for Name: expiry_alerts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expiry_alerts (id, vendor_id, product_id, expiry_date, days_until_expiry, is_resolved, resolved_at, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_adjustments (id, vendor_id, product_id, adjustment_type, quantity_change, quantity_before, quantity_after, reason, reference_number, performed_by, notes, created_at, store_id) FROM stdin;
\.


--
-- Data for Name: low_stock_alerts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.low_stock_alerts (id, vendor_id, product_id, current_quantity, threshold_quantity, is_resolved, resolved_at, created_at) FROM stdin;
40849a08-fb16-4d60-80c4-9f082f9892e2	7cc96e9a-bdd8-4602-a880-b690de3f2205	c48e69d8-c9dc-44d7-bc27-9cea3dbf44c3	3	5	f	\N	2025-12-21 03:31:38.820373
99e65f3b-b07f-4e85-8bb1-8731fbf96497	353909bf-f275-45ec-bb44-54660006d528	1db98045-5e46-44c6-9ee5-3546feb1983f	5	10	f	\N	2025-12-29 17:21:34.472964
2df18a06-f8e8-44bf-9310-231a3dff53c9	353909bf-f275-45ec-bb44-54660006d528	c3befc6b-40b9-40f2-91ec-7fa268f87002	5	10	f	\N	2025-12-29 17:21:34.472964
57091dfe-ad80-4c03-a12c-ded6fdb92d73	353909bf-f275-45ec-bb44-54660006d528	8845dcc9-c530-4099-a845-20473a842ec9	3	10	f	\N	2025-12-29 17:21:34.472964
c05e151e-ecc9-4ddd-b8f4-8ea5b2aadd8c	7cc96e9a-bdd8-4602-a880-b690de3f2205	c888f544-9d9c-4a7e-aa15-c4f6145b1473	0	10	f	\N	2026-01-03 20:59:09.655706
0438ff9d-f228-4a27-bd59-d25a88f8b0ff	7cc96e9a-bdd8-4602-a880-b690de3f2205	c888f544-9d9c-4a7e-aa15-c4f6145b1473	10	10	f	\N	2026-02-04 18:32:27.365821
8801141b-6b09-4335-870f-79186bcbf420	7cc96e9a-bdd8-4602-a880-b690de3f2205	c888f544-9d9c-4a7e-aa15-c4f6145b1473	9	10	f	\N	2026-02-05 15:33:21.335214
\.


--
-- Data for Name: marketing_ab_tests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_ab_tests (id, name, description, test_type, status, variant_a_id, variant_b_id, variant_a_name, variant_b_name, variant_a_conversions, variant_b_conversions, variant_a_conversion_rate, variant_b_conversion_rate, winner, start_date, end_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketing_ad_placements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_ad_placements (id, ad_id, placement_location, "position", is_active, created_at) FROM stdin;
\.


--
-- Data for Name: marketing_ads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_ads (id, campaign_id, name, ad_type, status, approval_status, approved_by, approved_at, title, description, image_url, video_url, cta_text, cta_link, design_data, placement, priority, target_audience, start_date, end_date, impressions, clicks, conversions, ctr, vendor_id, created_by, created_by_type, created_at, updated_at, slideshow_duration, slideshow_enabled, transition_style, chef_id) FROM stdin;
4d0968ab-ab06-4618-8a6f-a37d9318f762	\N	New Years Eve	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2025-12-30 01:22:31.721226	New Years Eve Special	Stock Reduction + Coupons	/api/v1/uploads/ads/ce5d0462-d3be-482f-a289-6d914c961592.jpeg	\N	Shop Now		{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_banner	0	null	2025-12-28 17:00:00	2025-12-31 17:00:00	144	0	0	0.00	353909bf-f275-45ec-bb44-54660006d528	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	vendor	2025-12-30 01:22:16.398976	2025-12-31 10:39:37.955124	10	t	fade	\N
96d14688-ec83-4959-b499-dffaadafbeb8	\N	New Year Special	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2025-12-29 20:13:47.311048	Special New Year Offer	20% off all purchases	/api/v1/uploads/ads/8844e7c1-5be6-4c42-a0c0-5c9ea71dc608.png	\N	Shop Now		{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_banner	0	null	\N	2026-01-04 17:00:00	1030	0	0	0.00	7cc96e9a-bdd8-4602-a880-b690de3f2205	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	vendor	2025-12-29 20:11:33.260826	2026-01-06 04:11:28.606075	10	t	fade	\N
097e4774-ccbb-4804-a1e7-05bd38c451c5	\N	New Spa	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2025-12-30 08:06:41.471376	Special Offer	Get 20% off	/api/v1/uploads/ads/38e2dc85-b421-47ff-88dc-16365763f78d.jpeg	\N	Shop Now		{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_banner	0	null	2025-12-26 17:00:00	2025-12-30 17:00:00	66	0	0	0.00	353909bf-f275-45ec-bb44-54660006d528	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	vendor	2025-12-30 08:04:46.365947	2026-01-08 05:44:30.234675	7	t	fade	\N
43d0d808-af35-4f64-a0ff-41bae28f1168	\N	Christmas Desires	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2026-01-04 06:48:49.713169	All You Ever Wanted		/api/v1/uploads/chefs/597dd04c-42b6-439c-afce-2409ddfdf1c7.WEBP	\N	View My Cuisines	http://localhost:3003/chefs/e7aad4f9-2610-4192-a0ee-5c1b32633056	{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_banner	0	null	\N	2026-01-07 17:00:00	1190	20	0	10.99	\N	e7aad4f9-2610-4192-a0ee-5c1b32633056	chef	2026-01-04 06:47:32.788527	2026-01-07 07:02:13.77369	7	t	fade	e7aad4f9-2610-4192-a0ee-5c1b32633056
3490c349-ea6f-4aff-ba8b-25c0f6e3b2b0	\N	Winter Sale	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2026-01-09 12:26:02.311936	Winter Special	Buy 1 get another 50%	\N	/api/v1/uploads/ads/4cf6b3bd-1ea2-480a-8083-7b61e7bd81b6.mov	Shop Now		{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_banner	0	null	2026-01-05 17:00:00	2026-01-14 17:00:00	76	0	0	0.00	353909bf-f275-45ec-bb44-54660006d528	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	vendor	2026-01-09 12:24:31.570926	2026-01-14 07:18:28.177827	10	t	fade	\N
d98d52e8-0f63-44bf-b4c2-5a55a698f3e9	\N	Testing Ads	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2025-12-30 00:53:29.276049	Valentine Special	Buy one get one free	/api/v1/uploads/ads/9e1a8b8d-68fc-48f4-8b7b-442bb26005a5.webp	\N	Shop Now		{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_banner	0	null	2026-01-21 17:00:00	2026-01-30 17:00:00	1974	0	0	0.00	353909bf-f275-45ec-bb44-54660006d528	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	vendor	2025-12-30 00:52:36.327963	2026-01-29 19:39:57.41142	10	t	fade	\N
5f1a1440-8945-457a-8244-d68c2a3ba869	\N	Testing Ads	popup	active	approved	377c986a-994e-449e-bee5-ef785a323156	2026-01-09 12:41:07.630786	Testing Ads for sale 	Make sure you try this out	\N	/api/v1/uploads/ads/2e778b8a-c0f3-4f85-bd00-3b8ab426baa5.mov	Shop Now	192.168.4.21:3003/top-market-deals	{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	stores_banner	0	null	2026-01-08 17:00:00	2026-01-12 17:00:00	63	2	0	6.45	353909bf-f275-45ec-bb44-54660006d528	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	vendor	2026-01-09 12:40:40.999308	2026-01-12 05:50:17.498834	10	t	fade	\N
23176810-123e-4d2d-b817-dacbf294d7a5	\N	Valentine Meal 	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2026-01-31 17:06:52.401649	Valentine Meal Sspecial		/api/v1/uploads/ads/f6d3189e-ce59-4b74-8873-292dc6e228f2.jpg	\N	Shop Now		{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_banner	0	null	2026-01-29 17:00:00	2026-02-05 17:00:00	174	0	0	0.00	7cc96e9a-bdd8-4602-a880-b690de3f2205	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	vendor	2026-01-31 17:06:29.589167	2026-02-05 01:42:22.293721	7	t	fade	\N
6f424f3a-df61-44da-9837-6e6c3c646fd4	\N	Hungry Man Special	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2026-01-31 17:09:31.54248	Hungry Man Special		/api/v1/uploads/ads/5915334e-5e69-4a07-a61a-ff343de7cbf1.webp	\N	Shop Now		{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_banner	0	null	2026-01-30 17:00:00	2026-02-06 17:00:00	354	0	0	0.00	7cc96e9a-bdd8-4602-a880-b690de3f2205	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	vendor	2026-01-31 17:08:32.534484	2026-02-06 02:47:17.538495	7	t	fade	\N
8f5cead4-b43a-45f9-93a2-c325504d3930	\N	Tester Ads	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2026-02-05 23:50:19.009162	Tester Ads		/api/v1/uploads/ads/593eea16-0b69-4253-a58c-2b7e08cc00c6.webp	\N	Shop Now		{"fontSize": 20, "textColor": "#7e4e4e", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_top_banner	0	null	2026-01-30 17:00:00	2026-02-06 17:00:00	323	0	0	0.00	7cc96e9a-bdd8-4602-a880-b690de3f2205	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	vendor	2026-02-05 23:50:03.34868	2026-02-07 00:29:24.374357	5	t	fade	\N
01b91ec3-3f3c-4a2b-88bf-9e915cb738c8	\N	February Delight	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2026-02-07 00:19:18.659058	February Delight	Hurry While Stock Lasts	/api/v1/uploads/ads/1c51f364-60f4-49d8-8c6d-f5a93d943a9c.webp	\N	Shop Now	http://localhost:3003/groceries	{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	home_top_banner	0	null	2026-02-05 17:00:00	2026-02-12 17:00:00	193	0	0	0.00	7cc96e9a-bdd8-4602-a880-b690de3f2205	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	vendor	2026-02-07 00:18:51.237604	2026-02-10 21:33:40.524534	6	t	fade	\N
332a1b3c-876a-4e83-8629-52f216998838	\N	Winter Tester	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2026-02-07 02:03:00.877404	Winter Tester	10% off any item	/api/v1/uploads/ads/b894efbd-f6a2-4712-864d-cf28820f35f2.jpeg	\N	Shop Now		{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff"}	meals_bottom_banner	1	null	2026-02-03 17:00:00	2026-02-11 17:00:00	90	0	0	0.00	7cc96e9a-bdd8-4602-a880-b690de3f2205	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	vendor	2026-02-07 02:02:18.134722	2026-02-10 21:33:40.485577	5	t	fade	\N
0bdd556a-066a-49da-b3d7-bc1d8cdc04fd	\N	Birthday Special	banner	active	approved	377c986a-994e-449e-bee5-ef785a323156	2026-02-07 00:44:39.620458	Birthday Special		/api/v1/uploads/chefs/39c4cf45-95dd-439f-9319-43e369ff7ba4.jpeg	\N	View My Cuisines		{"fontSize": 16, "textColor": "#000000", "fontFamily": "Arial", "backgroundColor": "#ffffff", "banner_optimized": false}	home_top_banner	0	null	2026-02-04 17:00:00	2026-02-10 17:00:00	181	0	0	0.00	\N	921ca14e-03cf-4083-ab37-e22de93808ed	chef	2026-02-07 00:43:58.793687	2026-02-10 15:59:49.340814	5	t	fade	921ca14e-03cf-4083-ab37-e22de93808ed
\.


--
-- Data for Name: marketing_audiences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_audiences (id, name, description, criteria, size, is_active, created_by, created_at, updated_at) FROM stdin;
d1281b32-48ce-4b12-85eb-47d98dda05b4	High Value	\N	{"match": "all", "rules": [{"property": "last_order_days", "operator": "gte", "value": "10"}]}	1	t	377c986a-994e-449e-bee5-ef785a323156	2026-02-07 01:38:26.16484	2026-02-07 01:38:26.164851
\.


--
-- Data for Name: marketing_automation_workflows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_automation_workflows (id, name, description, status, trigger_type, trigger_config, actions, conditions, active_instances, total_executions, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketing_budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_budgets (id, name, description, total_budget, spent, remaining, start_date, end_date, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketing_campaign_analytics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_campaign_analytics (id, campaign_id, ad_id, email_campaign_id, date, impressions, clicks, conversions, revenue, cost, created_at) FROM stdin;
\.


--
-- Data for Name: marketing_campaigns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_campaigns (id, name, description, campaign_type, status, start_date, end_date, budget, spent, target_audience, created_by, vendor_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketing_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_contacts (id, email, first_name, last_name, phone, company, job_title, lead_score, lead_status, properties, tags, last_contacted_at, last_email_opened_at, last_email_clicked_at, source, customer_id, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketing_content_library; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_content_library (id, name, description, content_type, file_url, thumbnail_url, file_size, mime_type, tags, category, is_public, usage_count, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketing_email_campaigns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_email_campaigns (id, campaign_id, name, subject, from_name, from_email, html_content, text_content, template_id, recipient_list, recipient_count, status, scheduled_at, sent_at, sent_count, delivered_count, opened_count, clicked_count, bounced_count, unsubscribed_count, created_by, vendor_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketing_email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_email_templates (id, name, category, subject, html_content, text_content, thumbnail_url, is_public, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketing_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_notifications (id, type, title, message, status, scheduled_at, sent_at, recipient_count, sent_count, delivered_count, opened_count, clicked_count, target_audience, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marketing_social_media_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketing_social_media_posts (id, platform, content, image_url, video_url, link_url, status, scheduled_at, published_at, likes, shares, comments, impressions, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, vendor_id, vendor_user_id, type, title, message, is_read, read_at, action_url, created_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal, is_substituted, original_product_id, substitution_reason, is_out_of_stock, quantity_fulfilled, created_at, cuisine_id) FROM stdin;
0a242c0b-20eb-49bf-b461-cd68411e4547	04d2b309-823a-4872-a64d-10d74945fe32	1d807d78-3b17-44d5-9b63-7a2114978368	Chin Chin	4.99	1	4.99	f	\N	\N	f	0	2025-12-22 10:33:38.704225	\N
3a09c701-7903-49df-87ec-5523b36270f6	04d2b309-823a-4872-a64d-10d74945fe32	8e01a6b8-2437-46bb-8e04-0e12181a87a3	Pineapple Juice	3.99	1	3.99	f	\N	\N	f	0	2025-12-22 10:33:38.704243	\N
eed9b593-156f-4fee-bebc-b0e8bf6dc6f6	04d2b309-823a-4872-a64d-10d74945fe32	a5e3de84-6651-4e5b-bc60-fc45f3cff8f6	Jollof Rice Seasoning	5.39	1	5.39	f	\N	\N	f	0	2025-12-22 10:33:38.704253	\N
fed1c990-5bc8-469a-956b-c3dc6b000085	0532ee3b-2582-4876-8aa9-97adff39b3e2	6ba66080-1de4-48cd-a4b3-c1546f4cdb95	Pounded Yam Mix	6.95	1	6.95	f	\N	\N	f	0	2026-02-05 01:00:00.663297	\N
771b1340-c03c-4b8f-ae79-5a97d7e7db35	9552a3ea-5c5f-46e6-ad72-ba83d90e202d	a94cccc2-62cf-4d7d-9495-d9ce45623b9d	Garri	5.21	1	5.21	f	\N	\N	f	0	2026-02-05 01:00:46.382147	\N
d0e4d38e-4fbc-4b85-8884-3e113224f832	0197a139-c536-4116-bb6f-75569c53de8c	ac012c0a-7b3a-4f4b-ac74-6c8e58f6e763	African Eggplant	4.99	1	4.99	f	\N	\N	f	0	2026-02-05 01:04:36.835344	\N
170836af-f3ca-4034-8d20-8102bab43aca	d663f549-0828-4d41-ab71-bc8a6754c4d6	6ba66080-1de4-48cd-a4b3-c1546f4cdb95	Pounded Yam Mix	6.95	1	6.95	f	\N	\N	f	0	2026-02-05 01:17:32.372843	\N
1cd05741-438e-4149-a327-bbaa74baa9fd	8c4756aa-5c78-4471-84a7-c8f286c6abb9	c888f544-9d9c-4a7e-aa15-c4f6145b1473	Frozen Tilapia	8.69	1	8.69	f	\N	\N	f	0	2026-02-05 01:22:51.462568	\N
7c27d409-a4e5-4a3b-8737-e154be33763b	5da8eade-de79-4e76-9609-792ce5e6f730	a94cccc2-62cf-4d7d-9495-d9ce45623b9d	Garri	5.21	1	5.21	f	\N	\N	f	0	2026-02-05 01:26:47.792499	\N
b97a3561-3585-402f-b0d3-b061b71ad4c1	fd9247ba-b563-41c9-b44e-99da84ab232f	c888f544-9d9c-4a7e-aa15-c4f6145b1473	Frozen Tilapia	8.69	1	8.69	f	\N	\N	f	0	2026-02-05 01:32:28.064377	\N
ffa3b8ce-7623-4cc5-a098-f52ec86290bf	016fd44e-dc8e-46d5-8172-893a14a6eadf	a94cccc2-62cf-4d7d-9495-d9ce45623b9d	Garri	5.21	1	5.21	f	\N	\N	f	0	2026-02-05 01:42:55.816468	\N
75f4b2b8-d411-45b8-8174-7a0ccdc4a13f	63690e8a-ffcd-42c5-b615-febbba5c2b54	a94cccc2-62cf-4d7d-9495-d9ce45623b9d	Garri	5.21	1	5.21	f	\N	\N	f	0	2026-02-05 20:55:27.513716	\N
45bb9d07-b49d-455d-a305-c89dae7d8ec6	c293dcf2-618f-47df-8a73-f3ea2d084776	a94cccc2-62cf-4d7d-9495-d9ce45623b9d	Garri	5.21	1	5.21	f	\N	\N	f	0	2026-02-05 21:01:53.126752	\N
8e8144e0-6808-496e-80d7-1b76d227be3a	bdf10a30-8f50-4137-a6e7-f7dd8c5bab4d	c888f544-9d9c-4a7e-aa15-c4f6145b1473	Frozen Tilapia	8.69	1	8.69	f	\N	\N	f	0	2026-02-05 22:33:22.260017	\N
1179e56b-c2b2-41bb-bd7e-4a90105e01e4	82293008-4d22-4fed-94ef-0cad5a405a5a	24a0d52e-948b-481d-97d7-ab0abc50e710	Yam	3.99	1	3.99	f	\N	\N	f	0	2026-02-05 23:11:28.504782	\N
d1645ed7-a238-435c-acf3-4caa688491b5	4d3e9cda-c552-4872-b9f2-54117cb435c4	a94cccc2-62cf-4d7d-9495-d9ce45623b9d	Garri	5.21	1	5.21	f	\N	\N	f	0	2026-02-06 01:53:55.526755	\N
\.


--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_status_history (id, order_id, status, changed_by, notes, created_at) FROM stdin;
6fca35fc-8dc9-48d6-a1e8-210f1dd85b83	d663f549-0828-4d41-ab71-bc8a6754c4d6	accepted	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order accepted by vendor	2026-02-05 01:21:09.465966
29306517-9e1c-4166-b0a0-c119af89fcd9	0532ee3b-2582-4876-8aa9-97adff39b3e2	cancelled	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Cancelled: No reason provided	2026-02-05 01:21:54.461059
dae62237-73c3-467f-8ffd-fa7110c644e6	9552a3ea-5c5f-46e6-ad72-ba83d90e202d	cancelled	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Cancelled: No reason provided	2026-02-05 01:22:02.471368
d735ac97-4829-4f8d-b814-b3b5336d8109	8c4756aa-5c78-4471-84a7-c8f286c6abb9	accepted	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order accepted by vendor	2026-02-06 01:10:16.645661
fe484570-eb66-45ad-9f8f-43fdbe7b9315	8c4756aa-5c78-4471-84a7-c8f286c6abb9	picking	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Picking started	2026-02-06 01:10:43.409872
0c030d88-1b4e-4fc9-b157-077753044952	8c4756aa-5c78-4471-84a7-c8f286c6abb9	ready	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order ready for pickup/delivery	2026-02-06 01:11:53.900513
6da65ba6-a78f-410e-bf5c-f53e3dcc2279	8c4756aa-5c78-4471-84a7-c8f286c6abb9	picked_up	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order picked_up	2026-02-06 01:13:33.117211
925efa3c-603d-41c7-aa91-3c59613f6cc7	5da8eade-de79-4e76-9609-792ce5e6f730	accepted	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order accepted by vendor	2026-02-06 01:21:20.697506
2c3ddee7-98f6-41f3-ae46-7138f3499a51	5da8eade-de79-4e76-9609-792ce5e6f730	picking	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Picking started	2026-02-06 01:23:16.448817
2232b1d5-cb17-44be-95a0-eb35ec727429	5da8eade-de79-4e76-9609-792ce5e6f730	ready	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order ready for pickup/delivery	2026-02-06 01:25:32.021228
62acdd09-0d43-4756-b2a6-ba1e434ac130	5da8eade-de79-4e76-9609-792ce5e6f730	picked_up	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order picked_up	2026-02-06 01:25:39.732153
74569192-2831-4d28-8d98-ad042369b374	63690e8a-ffcd-42c5-b615-febbba5c2b54	accepted	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order accepted by vendor	2026-02-06 01:31:27.041331
ab81435a-2b25-4512-8da9-13218841ecbd	63690e8a-ffcd-42c5-b615-febbba5c2b54	picking	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Picking started	2026-02-06 01:31:29.247159
dfeed01e-734c-44af-8438-d84d47d0fce2	63690e8a-ffcd-42c5-b615-febbba5c2b54	ready	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order ready for pickup/delivery	2026-02-06 01:31:33.817746
b9b35fcd-9028-4cf6-9ebd-810ba3e24dd9	63690e8a-ffcd-42c5-b615-febbba5c2b54	delivered	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order delivered	2026-02-06 01:31:38.720805
953d4f5a-1aba-4e74-9105-6f41db3ebbad	4d3e9cda-c552-4872-b9f2-54117cb435c4	accepted	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order accepted by vendor	2026-02-06 01:54:26.165711
74c3d7b5-d7d9-4d17-a8af-b63fd5df7195	4d3e9cda-c552-4872-b9f2-54117cb435c4	picking	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Picking started	2026-02-06 01:54:30.036385
eb480e74-276d-498b-870b-ac096e21a43e	4d3e9cda-c552-4872-b9f2-54117cb435c4	ready	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order ready for pickup/delivery	2026-02-06 01:54:35.760495
6a0a8d2a-dba3-4568-94dc-3674bb13deb1	d663f549-0828-4d41-ab71-bc8a6754c4d6	picking	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Picking started	2026-02-07 01:30:49.324132
55535d6f-23db-4d2f-a12f-b62b2f6b7b8c	d663f549-0828-4d41-ab71-bc8a6754c4d6	ready	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order ready for pickup/delivery	2026-02-07 01:30:58.655458
de7784a7-1e7f-483d-853c-ae26ac463410	d663f549-0828-4d41-ab71-bc8a6754c4d6	picked_up	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	Order picked_up	2026-02-07 01:31:03.17958
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, vendor_id, customer_id, status, delivery_method, delivery_address_id, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, gross_sales, commission_rate, commission_amount, net_payout, payment_status, payment_method, accepted_at, accepted_by, picking_started_at, picking_completed_at, ready_at, picked_up_at, delivered_at, special_instructions, customer_notes, cancelled_at, cancellation_reason, cancelled_by, created_at, updated_at, store_id, driver_id, helcim_transaction_id, helcim_card_token, chef_id, stripe_payment_intent_id) FROM stdin;
04d2b309-823a-4872-a64d-10d74945fe32	EZF-20251222-D9A65BD6	7cc96e9a-bdd8-4602-a880-b690de3f2205	3db6156e-97b3-4cf5-8c6c-2af032257531	cancelled	delivery	\N	14.37	1.15	5.00	0.00	20.52	14.37	10.00	1.44	12.93	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-12-22 10:33:38.631928	2026-01-06 02:30:09.039238	\N	\N	\N	\N	\N	\N
0197a139-c536-4116-bb6f-75569c53de8c	EZF-20260204-1EFA1A58	353909bf-f275-45ec-bb44-54660006d528	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	new	pickup	\N	4.99	0.40	0.00	0.00	5.39	4.99	15.00	0.75	4.24	pending	stripe	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-05 01:04:36.799555	2026-02-05 01:04:36.799561	\N	\N	\N	\N	\N	\N
0532ee3b-2582-4876-8aa9-97adff39b3e2	EZF-20260204-28F5CEA2	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	cancelled	pickup	\N	6.95	0.56	0.00	0.00	7.51	6.95	15.00	1.04	5.91	pending	stripe	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-05 01:21:54.388098	\N	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2026-02-05 00:59:59.879905	2026-02-04 18:21:54.339897	\N	\N	\N	\N	\N	\N
9552a3ea-5c5f-46e6-ad72-ba83d90e202d	EZF-20260204-F240C742	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	cancelled	pickup	\N	5.21	0.42	0.00	0.00	5.63	5.21	15.00	0.78	4.43	pending	stripe	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-05 01:22:02.302273	\N	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2026-02-05 01:00:46.369444	2026-02-04 18:22:02.296089	\N	\N	\N	\N	\N	\N
fd9247ba-b563-41c9-b44e-99da84ab232f	EZF-20260204-66CA21D2	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	new	pickup	\N	8.69	0.70	0.00	0.00	9.39	8.69	15.00	1.30	7.39	pending	stripe	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-05 01:32:27.40862	2026-02-05 01:32:27.408626	\N	\N	\N	\N	\N	\N
016fd44e-dc8e-46d5-8172-893a14a6eadf	EZF-20260204-3C01257B	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	new	pickup	\N	5.21	0.42	0.00	0.00	5.63	5.21	15.00	0.78	4.43	pending	stripe	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-05 01:42:55.317324	2026-02-05 01:42:55.317333	\N	\N	\N	\N	\N	\N
c293dcf2-618f-47df-8a73-f3ea2d084776	EZF-20260205-9B26174F	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	new	pickup	\N	5.21	0.42	0.00	0.00	5.63	5.21	15.00	0.78	4.43	pending	stripe	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-05 21:01:53.023504	2026-02-05 21:01:53.023512	\N	\N	\N	\N	\N	\N
bdf10a30-8f50-4137-a6e7-f7dd8c5bab4d	EZF-20260205-21004856	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	new	pickup	\N	8.69	0.70	0.00	0.00	9.39	8.69	15.00	1.30	7.39	pending	stripe	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-05 22:33:21.533776	2026-02-05 22:33:21.533793	\N	\N	\N	\N	\N	\N
82293008-4d22-4fed-94ef-0cad5a405a5a	EZF-20260205-E1903CA9	353909bf-f275-45ec-bb44-54660006d528	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	new	pickup	\N	3.99	0.32	0.00	0.00	4.31	3.99	15.00	0.60	3.39	pending	stripe	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-05 23:11:28.303323	2026-02-05 23:11:28.303341	\N	\N	\N	\N	\N	\N
8c4756aa-5c78-4471-84a7-c8f286c6abb9	EZF-20260204-662A349A	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	picked_up	pickup	\N	8.69	0.70	0.00	0.00	9.39	8.69	15.00	1.30	7.39	pending	stripe	2026-02-06 01:10:15.848718	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2026-02-06 01:10:43.390254	2026-02-06 01:11:53.867052	2026-02-06 01:11:53.867115	2026-02-06 01:13:33.110092	\N	\N	\N	\N	\N	\N	2026-02-05 01:22:51.391181	2026-02-05 18:13:33.09787	\N	\N	\N	\N	\N	\N
5da8eade-de79-4e76-9609-792ce5e6f730	EZF-20260204-B66765EC	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	picked_up	pickup	\N	5.21	0.42	0.00	0.00	5.63	5.21	15.00	0.78	4.43	pending	stripe	2026-02-06 01:21:20.672774	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2026-02-06 01:23:16.258224	2026-02-06 01:25:31.9536	2026-02-06 01:25:31.953629	2026-02-06 01:25:39.614963	\N	\N	\N	\N	\N	\N	2026-02-05 01:26:47.757526	2026-02-05 18:25:39.603406	\N	\N	\N	\N	\N	\N
63690e8a-ffcd-42c5-b615-febbba5c2b54	EZF-20260205-4859A5A1	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	delivered	delivery	c3435c8f-e89f-4b40-978d-7371004fad13	5.21	0.42	5.00	0.00	10.63	5.21	15.00	0.78	4.43	pending	stripe	2026-02-06 01:31:26.997191	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2026-02-06 01:31:29.240079	2026-02-06 01:31:33.812762	2026-02-06 01:31:33.812786	\N	2026-02-06 01:31:38.71191	\N	\N	\N	\N	\N	2026-02-05 20:55:27.316169	2026-02-05 18:31:38.707573	\N	\N	\N	\N	\N	\N
4d3e9cda-c552-4872-b9f2-54117cb435c4	EZF-20260205-2051B8A2	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	delivered	delivery	809efd36-0a08-4c58-808d-6929fd7c9bc0	5.21	0.42	5.00	0.00	10.63	5.21	10.00	0.52	4.69	pending	stripe	2026-02-06 01:54:26.137836	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2026-02-06 01:54:30.022134	2026-02-06 01:54:35.745577	2026-02-06 01:54:35.745612	2026-02-06 03:14:29.545812	2026-02-06 03:15:20.464286	\N	\N	\N	\N	\N	2026-02-06 01:53:55.287511	2026-02-05 20:15:20.453407	\N	cfebc011-73a1-42aa-9744-ef64edc6325a	\N	\N	\N	\N
d663f549-0828-4d41-ab71-bc8a6754c4d6	EZF-20260204-920A6C46	7cc96e9a-bdd8-4602-a880-b690de3f2205	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	picked_up	pickup	\N	6.95	0.56	0.00	0.00	7.51	6.95	15.00	1.04	5.91	pending	stripe	2026-02-05 01:21:09.428736	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2026-02-07 01:30:48.821407	2026-02-07 01:30:58.504986	2026-02-07 01:30:58.505009	2026-02-07 01:31:03.172563	\N	\N	\N	\N	\N	\N	2026-02-05 01:17:32.293397	2026-02-06 18:31:03.163697	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: payout_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payout_items (id, payout_id, order_id, order_number, gross_sales, commission_amount, net_payout, created_at) FROM stdin;
\.


--
-- Data for Name: payouts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payouts (id, vendor_id, payout_number, gross_amount, commission_amount, net_amount, fees, status, period_start, period_end, payout_method, bank_account_name, bank_account_number, transaction_reference, processed_at, completed_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.platform_settings (id, setting_type, settings_data, updated_by, created_at, updated_at) FROM stdin;
b8afcd17-848e-402c-a57b-dbecbd39f4be	general	{"currency": "CAD", "language": "en", "timezone": "America/Denver", "platform_name": "EAZy Foods", "platform_email": "support@eazyfoods.com", "platform_phone": "+1 (555) 123-4567", "maintenance_mode": false}	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	2025-12-29 23:45:52.925543	2025-12-29 23:46:06.865231
a2738b38-fd1d-46e4-b391-e3003675b1d5	payment	{"helcim_enabled": true, "payment_methods": ["credit_card", "debit_card"], "refund_policy_days": 5, "require_payment_verification": true}	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	2026-02-06 00:34:34.943165	2026-02-06 00:34:34.943178
023e0dd6-3cf4-48a0-8091-b9d45139c50c	commission	{"max_commission_rate": 30, "min_commission_rate": 5, "commission_calculation": "percentage", "default_commission_rate": 10}	01e3bb3f-68f1-468c-8f4c-25c5fd5dec1d	2026-01-06 09:35:41.484011	2026-02-06 00:36:57.309566
ce0e9391-a170-4e67-85c4-7ecbe9faae2f	marketing	{"max_daily_sms": 5000, "max_daily_emails": 10000, "auto_approve_chef_ads": false, "auto_approve_vendor_ads": false, "max_budget_per_campaign": 100000.0, "max_daily_notifications": 10000, "require_approval_for_budgets": true, "require_approval_for_campaigns": true}	377c986a-994e-449e-bee5-ef785a323156	2026-01-04 06:47:48.530097	2026-02-06 22:26:56.826608
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_variants (id, product_id, variant_name, variant_value, price_adjustment, stock_quantity, sku, barcode, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, vendor_id, name, description, price, sale_price, compare_at_price, category_id, subcategory_id, sku, barcode, vendor_sku, image_url, images, unit, weight_kg, variant_type, variant_value, parent_product_id, stock_quantity, low_stock_threshold, track_inventory, expiry_date, track_expiry, status, is_featured, slug, origin_country, created_at, updated_at, is_newly_stocked, store_id) FROM stdin;
1bb2d3df-4a58-49c4-978f-72af8bbc11dd	353909bf-f275-45ec-bb44-54660006d528	Fufu Flour	Fresh fufu flour - Premium quality African grocery item.	6.99	6.29	6.99	55804140-e525-4d10-97ba-4c32b95f2c13	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	62	10	t	\N	f	active	f	fufu-flour	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
1db98045-5e46-44c6-9ee5-3546feb1983f	353909bf-f275-45ec-bb44-54660006d528	Bitter Leaf	Fresh bitter leaf - Premium quality African grocery item.	4.99	4.24	4.99	68160b4d-f316-48ce-afaa-c85cb5775212	\N	\N	\N	\N	\N	\N	bunch	\N	\N	\N	\N	5	10	t	\N	f	active	t	bitter-leaf-1767054094	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
70ad821f-1f61-497c-b62f-847b3ae502a4	353909bf-f275-45ec-bb44-54660006d528	Cocoyam	Fresh cocoyam - Premium quality African grocery item.	4.49	\N	\N	68160b4d-f316-48ce-afaa-c85cb5775212	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	72	10	t	\N	f	active	f	cocoyam	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
da58dc90-f888-4c90-bbdf-da75d8a7cfc4	7cc96e9a-bdd8-4602-a880-b690de3f2205	Groundnut (Peanut)	Roasted groundnuts - perfect for snacks and cooking	6.99	\N	\N	70d6515d-f0d9-4846-ab4b-a3ad7f43691b	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	42	10	t	\N	f	active	f	groundnut-peanut	\N	2025-12-21 03:49:53.098046	2025-12-21 22:33:27.521709	f	\N
d9d8c9df-05a5-4e73-aa5d-33ef4d8c40aa	353909bf-f275-45ec-bb44-54660006d528	Bitter Kola	Fresh bitter kola - Premium quality African grocery item.	9.99	\N	\N	8fc516e9-7a7f-4e55-82eb-c361a6fefd3d	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	37	10	t	\N	f	active	t	bitter-kola	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
112ea6ca-77e3-461b-895a-27f0e2c59991	353909bf-f275-45ec-bb44-54660006d528	Kola Nuts	Fresh kola nuts - Premium quality African grocery item.	12.99	\N	\N	8fc516e9-7a7f-4e55-82eb-c361a6fefd3d	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	33	10	t	\N	f	active	f	kola-nuts	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
8e01a6b8-2437-46bb-8e04-0e12181a87a3	7cc96e9a-bdd8-4602-a880-b690de3f2205	Pineapple Juice	Fresh pineapple juice	3.99	\N	\N	a69e3e9a-b16c-4258-bd08-f245d78e5342	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/ee19bb78-d110-4181-b3a6-3b5cdf66a308.JPG	\N	bottle	\N	\N	\N	\N	59	10	t	\N	f	active	f	pineapple-juice-1766380969	\N	2025-12-21 22:22:49.080481	2026-01-03 23:14:28.809057	f	\N
039d641d-1e1a-4388-8269-2c9078db4cd9	353909bf-f275-45ec-bb44-54660006d528	Black-eyed Peas	Fresh black-eyed peas - Premium quality African grocery item.	5.99	\N	\N	685af2a7-c4f8-492e-a98e-a6c06cfb982a	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	13	10	t	\N	f	active	f	black-eyed-peas	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
cb4d4146-012f-4a8e-84f0-c358502b0665	353909bf-f275-45ec-bb44-54660006d528	Honey Beans	Fresh honey beans - Premium quality African grocery item.	6.49	5.19	6.49	685af2a7-c4f8-492e-a98e-a6c06cfb982a	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	94	10	t	\N	f	active	f	honey-beans	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
db751c63-bed2-4cab-895b-5e304942c175	353909bf-f275-45ec-bb44-54660006d528	Red Beans	Fresh red beans - Premium quality African grocery item.	5.99	\N	\N	685af2a7-c4f8-492e-a98e-a6c06cfb982a	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	76	10	t	\N	f	active	f	red-beans	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
480c56b0-3402-426c-be9b-b596b42e61f3	7cc96e9a-bdd8-4602-a880-b690de3f2205	Fufu Flour	Cassava fufu flour	6.99	\N	\N	70d6515d-f0d9-4846-ab4b-a3ad7f43691b	\N	\N	\N	\N	\N	\N	bag	\N	\N	\N	\N	40	10	t	\N	f	active	f	fufu-flour-1766380969	\N	2025-12-21 22:22:49.0795	2025-12-21 22:22:49.079502	f	\N
1d807d78-3b17-44d5-9b63-7a2114978368	7cc96e9a-bdd8-4602-a880-b690de3f2205	Chin Chin	Sweet fried snack	4.99	\N	\N	6fa83ad5-af3b-4da1-80a7-f750c352a21f	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/47b1fb68-20ef-4a3e-92f6-b7bb998af1b3.webp	\N	pack	\N	\N	\N	\N	44	10	t	\N	f	active	f	chin-chin-1766380969	\N	2025-12-21 22:22:49.080976	2026-01-09 14:09:54.781742	f	\N
0a595a84-f3d7-4c82-ad49-0f9586dcecee	7cc96e9a-bdd8-4602-a880-b690de3f2205	Palm Oil	Pure red palm oil, essential for African cooking	8.99	\N	\N	33183fdd-b6e0-42ad-9c7c-fe0e37179ddd	\N	\N	\N	\N	\N	\N	bottle	\N	\N	\N	\N	50	10	t	\N	f	active	f	palm-oil-1766380968	\N	2025-12-21 22:22:48.890075	2025-12-31 19:34:46.864847	f	\N
9680d06a-594d-400f-a06b-c370f11b59ba	7cc96e9a-bdd8-4602-a880-b690de3f2205	Plantain	Fresh ripe plantains	4.99	\N	\N	26965452-197a-4382-955e-2260b04505fe	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/ec0249f5-9965-4a16-8d6a-20ee89439822.JPG	\N	bunch	\N	\N	\N	\N	30	10	t	\N	f	active	f	plantain-1766380969	\N	2025-12-21 22:22:49.077518	2026-01-10 06:14:36.923528	f	\N
76662369-6e5a-4654-84da-38d1508ed560	7cc96e9a-bdd8-4602-a880-b690de3f2205	Egusi Seeds	Ground melon seeds for soups	12.99	\N	\N	b86a60e0-1867-4d6c-a20b-6380fbea3253	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/5d727da2-e519-4c2a-adaa-4af5236bac70.WEBP	\N	pack	\N	\N	\N	\N	25	10	t	\N	f	active	f	egusi-seeds-1766380969	\N	2025-12-21 22:22:49.078916	2026-01-04 00:05:11.410889	f	\N
052d7698-727e-4121-8f44-93521e2c657e	353909bf-f275-45ec-bb44-54660006d528	Scotch Bonnet Peppers	Fresh scotch bonnet peppers - Premium quality African grocery item.	6.99	5.94	\N	68160b4d-f316-48ce-afaa-c85cb5775212	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/060a3096-b880-4274-9831-5773895985f2.JPG	\N	kg	\N	\N	\N	\N	81	10	t	\N	f	active	f	scotch-bonnet-peppers	\N	2025-12-29 17:21:34.472964	2026-02-04 13:55:51.180999	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
466e8ed0-f56e-49fa-8640-ad55b1d05aa4	353909bf-f275-45ec-bb44-54660006d528	Okra	Fresh okra - Premium quality African grocery item.	5.99	4.49	\N	68160b4d-f316-48ce-afaa-c85cb5775212	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/01ddb85b-52ec-4251-b883-5306d52802e4.jpeg	\N	kg	\N	\N	\N	\N	21	10	t	\N	f	active	f	okra	\N	2025-12-29 17:21:34.472964	2026-01-12 14:00:58.068219	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
6ba66080-1de4-48cd-a4b3-c1546f4cdb95	7cc96e9a-bdd8-4602-a880-b690de3f2205	Pounded Yam Mix	Instant pounded yam mix - quick and easy preparation	7.99	\N	\N	70d6515d-f0d9-4846-ab4b-a3ad7f43691b	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/b1a00d3c-7eb2-497f-aab7-4e31ce0753ad.JPG	\N	kg	\N	\N	\N	\N	30	10	t	\N	f	active	f	pounded-yam-mix	\N	2025-12-19 21:45:14.217502	2026-02-07 04:49:07.938347	f	\N
89dedead-8475-4cb0-8974-dac8f302e03f	7cc96e9a-bdd8-4602-a880-b690de3f2205	Suya Spice Mix	Authentic suya spice mix - perfect for grilled meats	8.49	\N	\N	70d6515d-f0d9-4846-ab4b-a3ad7f43691b	\N	\N	\N	\N	\N	\N	pack	\N	\N	\N	\N	18	10	t	\N	f	active	t	suya-spice-mix	\N	2025-12-19 21:45:14.217502	2025-12-31 19:34:46.864847	f	\N
5141d470-f745-4776-b15b-2ea425ad0acd	353909bf-f275-45ec-bb44-54660006d528	Egusi Seeds	Fresh egusi seeds - Premium quality African grocery item.	15.99	\N	\N	8fc516e9-7a7f-4e55-82eb-c361a6fefd3d	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/93d9fc95-d327-4f76-bc9f-db1ae65338d9.jpeg	\N	kg	\N	\N	\N	\N	78	10	t	\N	f	active	f	egusi-seeds	\N	2025-12-29 17:21:34.472964	2026-01-07 22:39:27.371232	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
24a0d52e-948b-481d-97d7-ab0abc50e710	353909bf-f275-45ec-bb44-54660006d528	Yam	Fresh yam - Premium quality African grocery item.	3.99	\N	\N	68160b4d-f316-48ce-afaa-c85cb5775212	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/af52094e-9a9e-4c81-af94-4c1181a1b3aa.png	\N	kg	\N	\N	\N	\N	23	10	t	\N	f	active	f	yam	\N	2025-12-29 17:21:34.472964	2026-02-05 16:11:28.275109	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
2f00726d-4406-45ab-b495-2ebe358924c7	353909bf-f275-45ec-bb44-54660006d528	Palm Oil	Fresh palm oil - Premium quality African grocery item.	12.99	\N	\N	33183fdd-b6e0-42ad-9c7c-fe0e37179ddd	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/3de1d28b-698a-41d1-8249-a950b72d0217.jpeg	\N	bottle	\N	\N	\N	\N	44	10	t	2026-01-22	t	active	t	palm-oil	\N	2025-12-29 17:21:34.472964	2026-01-06 06:38:19.013381	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
cdba76e0-c5ad-4b04-9e9f-7e8ec1df6993	353909bf-f275-45ec-bb44-54660006d528	Brown Beans	Fresh brown beans - Premium quality African grocery item.	5.49	\N	\N	685af2a7-c4f8-492e-a98e-a6c06cfb982a	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/206cdfc3-d9a1-42db-9f2c-eaebaac6b030.jpeg	\N	kg	\N	\N	\N	\N	33	10	t	\N	f	active	f	brown-beans	\N	2025-12-29 17:21:34.472964	2026-01-06 06:39:10.616757	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
ac012c0a-7b3a-4f4b-ac74-6c8e58f6e763	353909bf-f275-45ec-bb44-54660006d528	African Eggplant	Fresh african eggplant - Premium quality African grocery item.	4.99	3.99	\N	68160b4d-f316-48ce-afaa-c85cb5775212	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/8515eb5a-046d-43b4-8502-1bc76e09edef.png	\N	kg	\N	\N	\N	\N	77	10	t	\N	f	active	f	african-eggplant	\N	2025-12-29 17:21:34.472964	2026-02-04 18:04:36.770678	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
4dff1e4c-3a21-4377-88c1-f6c994a93c76	353909bf-f275-45ec-bb44-54660006d528	Groundnut (Peanuts)	Fresh groundnut (peanuts) - Premium quality African grocery item.	8.99	7.64	8.99	8fc516e9-7a7f-4e55-82eb-c361a6fefd3d	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/7abacf44-c88b-40cd-a1d2-e364d0273b20.jpeg	\N	kg	\N	\N	\N	\N	74	10	t	\N	f	active	f	groundnut-peanuts	\N	2025-12-29 17:21:34.472964	2026-01-06 06:42:35.724324	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
8455e9c5-62ea-433a-a7fa-105d033cf10d	353909bf-f275-45ec-bb44-54660006d528	Groundnut Oil	Fresh groundnut oil - Premium quality African grocery item.	9.99	\N	\N	33183fdd-b6e0-42ad-9c7c-fe0e37179ddd	\N	\N	\N	\N	\N	\N	bottle	\N	\N	\N	\N	15	10	t	\N	f	active	f	groundnut-oil	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
69a17c70-10ae-4d8e-a8d7-02a6ebc86957	353909bf-f275-45ec-bb44-54660006d528	Curry Powder	Fresh curry powder - Premium quality African grocery item.	4.99	\N	\N	20c9fe3d-881a-4360-8517-4bcbedcee173	\N	\N	\N	\N	\N	\N	pack	\N	\N	\N	\N	20	10	t	\N	f	active	t	curry-powder	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
13b85bfc-3a32-4909-99f2-d3a64e746c5a	353909bf-f275-45ec-bb44-54660006d528	Thyme	Fresh thyme - Premium quality African grocery item.	3.99	3.39	3.99	20c9fe3d-881a-4360-8517-4bcbedcee173	\N	\N	\N	\N	\N	\N	pack	\N	\N	\N	\N	57	10	t	\N	f	active	f	thyme	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
35dea2bb-9aad-45d8-92fb-0b054d9bce3b	353909bf-f275-45ec-bb44-54660006d528	Bay Leaves	Fresh bay leaves - Premium quality African grocery item.	2.99	\N	\N	20c9fe3d-881a-4360-8517-4bcbedcee173	\N	\N	\N	\N	\N	\N	pack	\N	\N	\N	\N	47	10	t	\N	f	active	t	bay-leaves	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
e4d22aeb-34db-4cc1-890c-735fb213c8a9	353909bf-f275-45ec-bb44-54660006d528	Crayfish	Fresh crayfish - Premium quality African grocery item.	19.99	15.99	19.99	27960025-9e5c-4ade-b620-0fb691868ebc	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	24	10	t	\N	f	active	f	crayfish	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
f87cf145-3425-47eb-a0fb-4d16cfb7f434	353909bf-f275-45ec-bb44-54660006d528	Goat Meat	Fresh goat meat - Premium quality African grocery item.	24.99	\N	\N	f0093908-30f9-4460-9bc7-5c9a0d7a89a3	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	69	10	t	\N	f	active	t	goat-meat	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
2a946dbb-8349-4bc2-856e-0327b842e487	353909bf-f275-45ec-bb44-54660006d528	African Bread	Fresh african bread - Premium quality African grocery item.	4.99	\N	\N	9658b60d-587c-489b-9b90-69223e16946d	\N	\N	\N	\N	\N	\N	loaf	\N	\N	\N	\N	64	10	t	\N	f	active	f	african-bread	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
4096c785-38df-4500-9758-4b95a516f25e	353909bf-f275-45ec-bb44-54660006d528	Agege Bread	Fresh agege bread - Premium quality African grocery item.	3.99	\N	\N	9658b60d-587c-489b-9b90-69223e16946d	\N	\N	\N	\N	\N	\N	loaf	\N	\N	\N	\N	81	10	t	\N	f	active	t	agege-bread	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
b85032e4-fcaa-4dff-af60-f597f144aeaf	353909bf-f275-45ec-bb44-54660006d528	Puff Puff Mix	Fresh puff puff mix - Premium quality African grocery item.	5.99	4.79	5.99	9658b60d-587c-489b-9b90-69223e16946d	\N	\N	\N	\N	\N	\N	pack	\N	\N	\N	\N	29	10	t	\N	f	active	f	puff-puff-mix	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
8845dcc9-c530-4099-a845-20473a842ec9	353909bf-f275-45ec-bb44-54660006d528	Chin Chin	Fresh chin chin - Premium quality African grocery item.	6.99	\N	\N	ec63bc8b-ff1e-4e20-b195-de755c32cfbe	\N	\N	\N	\N	\N	\N	pack	\N	\N	\N	\N	3	10	t	\N	f	active	t	chin-chin	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
963669d2-1cbc-4cda-a088-7dedff1221be	353909bf-f275-45ec-bb44-54660006d528	Chapman	Fresh chapman - Premium quality African grocery item.	4.99	4.24	4.99	a69e3e9a-b16c-4258-bd08-f245d78e5342	\N	\N	\N	\N	\N	\N	bottle	\N	\N	\N	\N	78	10	t	\N	f	active	t	chapman	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
99ad6561-9622-4ab2-8771-932acc3f04fa	353909bf-f275-45ec-bb44-54660006d528	Cashew Nuts	Fresh cashew nuts - Premium quality African grocery item.	15.99	\N	\N	8fc516e9-7a7f-4e55-82eb-c361a6fefd3d	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	81	10	t	\N	f	active	f	cashew-nuts	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
36813333-f38a-42b5-9439-a3173d0fa0c5	353909bf-f275-45ec-bb44-54660006d528	Almonds	Fresh almonds - Premium quality African grocery item.	18.99	\N	\N	8fc516e9-7a7f-4e55-82eb-c361a6fefd3d	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	70	10	t	\N	f	active	f	almonds	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
3e379d33-87d8-48d8-a2bc-9eaf15dc630e	353909bf-f275-45ec-bb44-54660006d528	Dried Mango	Fresh dried mango - Premium quality African grocery item.	9.99	7.49	9.99	9b711592-bd2c-4b98-b10b-2cbd659a7d98	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	62	10	t	\N	f	active	f	dried-mango	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
dd8d47d6-4db6-4568-bdfe-767a04cac2bc	353909bf-f275-45ec-bb44-54660006d528	Dried Pineapple	Fresh dried pineapple - Premium quality African grocery item.	8.99	7.19	8.99	9b711592-bd2c-4b98-b10b-2cbd659a7d98	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	58	10	t	\N	f	active	f	dried-pineapple	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
f28abca7-d2eb-4964-8b0e-1685f13c55fa	353909bf-f275-45ec-bb44-54660006d528	Fresh Pineapple	Fresh fresh pineapple - Premium quality African grocery item.	3.99	\N	\N	9b711592-bd2c-4b98-b10b-2cbd659a7d98	\N	\N	\N	\N	\N	\N	piece	\N	\N	\N	\N	39	10	t	\N	f	active	f	fresh-pineapple	\N	2025-12-29 17:21:34.472964	2025-12-29 17:21:34.472964	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
661b2797-8609-4a81-9c98-44ea87bb0ac6	353909bf-f275-45ec-bb44-54660006d528	Chicken	Fresh chicken - Premium quality African grocery item.	18.99	\N	\N	f0093908-30f9-4460-9bc7-5c9a0d7a89a3	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/c7397970-8b1c-4722-ae65-ac23c4c3bb81.jpg	\N	kg	\N	\N	\N	\N	17	10	t	\N	f	active	t	chicken	\N	2025-12-29 17:21:34.472964	2026-01-12 14:00:58.068219	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
2a9d75d2-8cce-4ea2-9f92-bc7abc276151	353909bf-f275-45ec-bb44-54660006d528	Maggi Cubes	Fresh maggi cubes - Premium quality African grocery item.	3.79	\N	3.99	20c9fe3d-881a-4360-8517-4bcbedcee173	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/82a1edd1-35df-4069-9b8b-3ca730dfa5f0.webp	\N	pack	\N	\N	\N	\N	52	10	t	\N	f	active	f	maggi-cubes	\N	2025-12-29 17:21:34.472964	2026-02-06 13:14:37.026853	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
6e47d537-5c45-46af-a0ee-bda18b221a3b	353909bf-f275-45ec-bb44-54660006d528	Dried Fish	Fresh dried fish - Premium quality African grocery item.	14.99	\N	\N	27960025-9e5c-4ade-b620-0fb691868ebc	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/3819335e-3a2b-4fa2-8431-e3e1946fb9e2.JPG	\N	kg	\N	\N	\N	\N	11	10	t	\N	f	active	f	dried-fish	\N	2025-12-29 17:21:34.472964	2026-01-04 08:08:55.932255	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
52aca8f5-8b02-411d-8ff4-a07b570c9e33	353909bf-f275-45ec-bb44-54660006d528	Stockfish	Fresh stockfish - Premium quality African grocery item.	18.99	\N	\N	27960025-9e5c-4ade-b620-0fb691868ebc	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/f187a2aa-7bcc-4d2d-9c9f-ba5d63b40d41.JPG	\N	kg	\N	\N	\N	\N	13	10	t	\N	f	active	f	stockfish	\N	2025-12-29 17:21:34.472964	2026-01-10 23:41:37.80438	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
389a3a21-937c-476a-8799-f2d4c883acea	353909bf-f275-45ec-bb44-54660006d528	Banga Spice	Fresh banga spice - Premium quality African grocery item.	5.99	\N	\N	20c9fe3d-881a-4360-8517-4bcbedcee173	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/f68655b3-cad2-443c-901c-05013a387562.WEBP	\N	pack	\N	\N	\N	\N	30	10	t	\N	f	active	f	banga-spice	\N	2025-12-29 17:21:34.472964	2026-01-04 08:09:59.35633	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
2d4a2730-4c6e-4e82-9261-50dd8fb6c047	353909bf-f275-45ec-bb44-54660006d528	Papaya	Fresh papaya - Premium quality African grocery item.	4.49	\N	\N	9b711592-bd2c-4b98-b10b-2cbd659a7d98	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/83b53167-040a-4d85-abb4-280a0a8d704a.JPG	\N	kg	\N	\N	\N	\N	66	10	t	\N	f	active	f	papaya	\N	2025-12-29 17:21:34.472964	2026-01-04 08:10:35.392509	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
f4bda4ca-c67e-47a6-94e7-1d6faa750282	353909bf-f275-45ec-bb44-54660006d528	Fish	Fresh smoked fish - Premium quality African grocery item.	16.99	\N	\N	27960025-9e5c-4ade-b620-0fb691868ebc	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/49c986ed-80d7-4e42-a954-0388ac01ab5e.jpeg	\N	kg	\N	\N	\N	\N	47	10	t	\N	f	active	f	smoked-fish	\N	2025-12-29 17:21:34.472964	2026-01-14 00:17:20.008809	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
0d5a2101-5372-4c30-a5ab-ec793f9b50fd	353909bf-f275-45ec-bb44-54660006d528	Buns	Fresh buns - Premium quality African grocery item.	4.49	\N	\N	9658b60d-587c-489b-9b90-69223e16946d	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/7c2c61c7-16e0-43e3-8dc4-6bb86cd63262.JPG	\N	pack	\N	\N	\N	\N	98	10	t	\N	f	active	f	buns	\N	2025-12-29 17:21:34.472964	2026-02-04 13:55:51.180999	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
7ee68751-1bc2-4de3-be27-1542c206aff6	353909bf-f275-45ec-bb44-54660006d528	Beef	Fresh beef - Premium quality African grocery item.	21.84	\N	22.99	f0093908-30f9-4460-9bc7-5c9a0d7a89a3	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	62	10	t	\N	f	active	f	beef	\N	2025-12-29 17:21:34.472964	2026-02-06 13:14:37.026853	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
8426df32-67a5-4506-a97d-668d5c6c59c7	353909bf-f275-45ec-bb44-54660006d528	Turkey	Fresh turkey - Premium quality African grocery item.	25.64	\N	26.99	f0093908-30f9-4460-9bc7-5c9a0d7a89a3	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	94	10	t	\N	f	active	t	turkey	\N	2025-12-29 17:21:34.472964	2026-02-06 13:14:37.026853	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
1a796416-b05b-4031-a011-5e0d0bf8d1ae	353909bf-f275-45ec-bb44-54660006d528	Suya Spice Mix	Fresh suya spice mix - Premium quality African grocery item.	7.99	7.19	\N	20c9fe3d-881a-4360-8517-4bcbedcee173	\N	\N	\N	\N	\N	\N	pack	\N	\N	\N	\N	32	10	t	\N	f	active	t	suya-spice-mix-1767054095	\N	2025-12-29 17:21:34.472964	2025-12-31 19:34:46.864847	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
51d1ac27-df47-45ad-bf50-69765e47f4d3	353909bf-f275-45ec-bb44-54660006d528	Maltina	Fresh maltina - Premium quality African grocery item.	3.99	\N	\N	a69e3e9a-b16c-4258-bd08-f245d78e5342	\N	\N	\N	\N	\N	\N	bottle	\N	\N	\N	\N	39	10	t	\N	f	active	f	maltina	\N	2025-12-29 17:21:34.472964	2025-12-31 19:34:46.864847	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
59f5ff26-8954-4425-9ad5-bb19707266ca	353909bf-f275-45ec-bb44-54660006d528	Zobo Drink	Fresh zobo drink - Premium quality African grocery item.	5.99	4.79	\N	a69e3e9a-b16c-4258-bd08-f245d78e5342	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/4f141070-4fa3-4cca-a82c-f7b0f57888e6.JPG	\N	bottle	\N	\N	\N	\N	81	10	t	\N	f	active	f	zobo-drink	\N	2025-12-29 17:21:34.472964	2026-02-04 13:55:51.180999	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
cf75cee3-46fa-42a1-a3a9-5f884c119692	7cc96e9a-bdd8-4602-a880-b690de3f2205	Bitter Leaf	Fresh bitter leaf - essential for Nigerian soups	4.99	\N	\N	70d6515d-f0d9-4846-ab4b-a3ad7f43691b	\N	\N	\N	\N	\N	\N	bunch	\N	\N	\N	\N	22	10	t	\N	f	active	f	bitter-leaf	\N	2025-12-19 21:45:14.217502	2025-12-31 19:34:46.864847	f	\N
2393e155-85ec-46c1-a402-ff3eee7f42ac	353909bf-f275-45ec-bb44-54660006d528	Garri (Cassava Flakes)	Fresh garri (cassava flakes) - Premium quality African grocery item.	7.99	6.79	\N	55804140-e525-4d10-97ba-4c32b95f2c13	\N	\N	\N	\N	\N	\N	kg	\N	\N	\N	\N	47	10	t	\N	f	active	t	garri-cassava-flakes	\N	2025-12-29 17:21:34.472964	2026-01-05 13:56:49.688153	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
263a57ff-4e6c-4ecc-b2ce-3166691c437e	353909bf-f275-45ec-bb44-54660006d528	Plantain Chips	Fresh plantain chips - Premium quality African grocery item.	5.99	\N	\N	ec63bc8b-ff1e-4e20-b195-de755c32cfbe	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/9923e9e6-6466-480d-b629-8870e76d5bc3.JPG	\N	pack	\N	\N	\N	\N	15	10	t	\N	f	active	f	plantain-chips	\N	2025-12-29 17:21:34.472964	2026-01-05 13:56:49.688153	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
3f16b392-77ac-4c79-be66-f670d7ffcfa8	353909bf-f275-45ec-bb44-54660006d528	Jollof Rice Mix	Fresh jollof rice mix - Premium quality African grocery item.	8.99	\N	\N	55804140-e525-4d10-97ba-4c32b95f2c13	\N	\N	\N	\N	\N	\N	pack	\N	\N	\N	\N	33	10	t	\N	f	active	f	jollof-rice-mix	\N	2025-12-29 17:21:34.472964	2026-01-05 13:56:49.688153	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
7a5f7fff-05f1-46f6-a751-2ca44cb060cb	353909bf-f275-45ec-bb44-54660006d528	Tiger Nuts	Fresh tiger nuts - Premium quality African grocery item.	8.99	\N	\N	8fc516e9-7a7f-4e55-82eb-c361a6fefd3d	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/b8a86d83-43ff-4383-b4a3-3c17a2fe039b.png	\N	kg	\N	\N	\N	\N	87	10	t	\N	f	active	f	tiger-nuts	\N	2025-12-29 17:21:34.472964	2026-01-09 05:15:42.543484	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
472d14c4-fd99-4051-8577-8927aba20ca7	353909bf-f275-45ec-bb44-54660006d528	Knorr Cubes	Fresh knorr cubes - Premium quality African grocery item.	3.32	\N	3.49	20c9fe3d-881a-4360-8517-4bcbedcee173	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/79d58dcb-29a4-4666-b7a7-69b24bdb63b4.jpeg	\N	pack	\N	\N	\N	\N	40	10	t	\N	f	active	t	knorr-cubes	\N	2025-12-29 17:21:34.472964	2026-02-06 13:14:37.026853	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
c3befc6b-40b9-40f2-91ec-7fa268f87002	353909bf-f275-45ec-bb44-54660006d528	Pepper Soup Spice	Fresh pepper soup spice - Premium quality African grocery item.	6.64	\N	6.99	20c9fe3d-881a-4360-8517-4bcbedcee173	\N	\N	\N	\N	\N	\N	pack	\N	\N	\N	\N	5	10	t	\N	f	active	t	pepper-soup-spice	\N	2025-12-29 17:21:34.472964	2026-02-06 13:14:37.026853	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
a94cccc2-62cf-4d7d-9495-d9ce45623b9d	7cc96e9a-bdd8-4602-a880-b690de3f2205	Garri	Premium garri (cassava flakes) - ready to eat or cook	5.99	\N	\N	70d6515d-f0d9-4846-ab4b-a3ad7f43691b	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/860817bb-ccc1-4fc9-a09d-1897fa873805.JPG	\N	kg	\N	\N	\N	\N	32	10	t	\N	f	active	f	garri	\N	2025-12-21 03:49:53.098671	2026-02-07 04:49:07.938347	f	\N
a5e3de84-6651-4e5b-bc60-fc45f3cff8f6	7cc96e9a-bdd8-4602-a880-b690de3f2205	Jollof Rice Seasoning	Special blend for authentic jollof rice	5.99	\N	\N	8268f67b-a91f-4329-ba73-6456cf6ab9e4	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/856c4a2e-d139-4944-9341-d74277645844.JPG	\N	pack	\N	\N	\N	\N	34	10	t	\N	f	active	f	jollof-rice-seasoning-1766380969	\N	2025-12-21 22:22:49.079995	2026-01-10 06:14:36.923528	f	\N
76164fb6-ab6a-40b0-afbf-9eab416da540	353909bf-f275-45ec-bb44-54660006d528	Coconut Oil	Fresh coconut oil - Premium quality African grocery item.	11.99	10.79	\N	33183fdd-b6e0-42ad-9c7c-fe0e37179ddd	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/d645f1e3-ec7c-40e4-afde-ce35af074023.jpeg	\N	bottle	\N	\N	\N	\N	28	10	t	\N	f	active	t	coconut-oil	\N	2025-12-29 17:21:34.472964	2026-01-12 14:00:58.068219	t	6fec9aa3-27ca-4107-b046-80ca0368ab60
c48e69d8-c9dc-44d7-bc27-9cea3dbf44c3	7cc96e9a-bdd8-4602-a880-b690de3f2205	bread	breakfast meal	4.50	\N	\N	70d6515d-f0d9-4846-ab4b-a3ad7f43691b	\N			\N	\N	\N	piece	\N	\N	\N	\N	3	5	t	\N	f	active	f		\N	2025-12-20 04:40:41.921385	2026-02-07 04:49:07.938347	f	\N
c888f544-9d9c-4a7e-aa15-c4f6145b1473	7cc96e9a-bdd8-4602-a880-b690de3f2205	Frozen Tilapia	Fresh frozen whole tilapia	9.99	\N	\N	26965452-197a-4382-955e-2260b04505fe	\N	\N	\N	\N	http://localhost:3000/api/v1/uploads/products/f75228b1-a91a-4382-acdc-0d2ef31b0993.JPG	\N	piece	\N	\N	\N	\N	9	10	t	\N	f	active	f	frozen-tilapia-1766380969	\N	2025-12-21 22:22:49.08137	2026-02-07 04:49:07.938347	t	\N
11f04e5f-2a10-4321-8dc5-6da1da810546	353909bf-f275-45ec-bb44-54660006d528	Watermelon	Fresh watermelon - Premium quality African grocery item.	5.99	5.09	\N	9b711592-bd2c-4b98-b10b-2cbd659a7d98	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/339180da-332f-43d8-a07b-ec0bafeda9bf.jpeg	\N	piece	\N	\N	\N	\N	30	10	t	\N	f	active	f	watermelon	\N	2025-12-29 17:21:34.472964	2026-02-04 13:55:51.180999	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
2de960c5-cbaf-4efb-b0fc-7aaaa5bf91d2	353909bf-f275-45ec-bb44-54660006d528	Fresh Mango	Fresh fresh mango - Premium quality African grocery item.	4.99	4.24	\N	9b711592-bd2c-4b98-b10b-2cbd659a7d98	\N	\N	\N	\N	http://192.168.4.21:3000/api/v1/uploads/products/904e5306-8c85-4488-9f5e-c65503003c66.jpeg	\N	kg	\N	\N	\N	\N	14	10	t	\N	f	active	f	fresh-mango	\N	2025-12-29 17:21:34.472964	2026-02-04 13:55:51.180999	f	6fec9aa3-27ca-4107-b046-80ca0368ab60
\.


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotions (id, vendor_id, name, description, promotion_type, discount_type, discount_value, minimum_order_amount, applies_to_all_products, product_ids, minimum_margin_enforced, requires_approval, approval_status, approved_by, approved_at, start_date, end_date, is_active, created_at, updated_at, chef_id, cuisine_ids) FROM stdin;
41c8e601-8208-4020-9d57-cb1671eb8189	353909bf-f275-45ec-bb44-54660006d528	Grab Your Copy		discount	percentage	22.00	\N	f	{3f16b392-77ac-4c79-be66-f670d7ffcfa8,263a57ff-4e6c-4ecc-b2ce-3166691c437e,2393e155-85ec-46c1-a402-ff3eee7f42ac}	t	f	approved	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	2026-01-01 02:12:53.48464	2025-12-31 19:12:00	2026-01-05 19:12:00	f	2026-01-01 02:12:53.633351	2026-01-05 13:56:49.688153	\N	\N
e510b1e8-cbed-4136-b8f0-2486a18ae850	353909bf-f275-45ec-bb44-54660006d528	Newly Stocked		discount	percentage	5.00	\N	f	{ac012c0a-7b3a-4f4b-ac74-6c8e58f6e763,52aca8f5-8b02-411d-8ff4-a07b570c9e33,7a5f7fff-05f1-46f6-a751-2ca44cb060cb}	t	f	approved	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	2026-01-01 02:15:54.183823	2025-12-31 19:15:00	2026-01-10 19:15:00	f	2026-01-01 02:15:54.185429	2026-01-10 23:41:37.80438	\N	\N
0d81b7eb-7e89-4bea-8919-51fc38681aea	353909bf-f275-45ec-bb44-54660006d528	Lunch Special	Shop for groceries during lunch and get a discount 	store_wide_sale	percentage	10.00	\N	f	{466e8ed0-f56e-49fa-8640-ad55b1d05aa4,76164fb6-ab6a-40b0-afbf-9eab416da540,661b2797-8609-4a81-9c98-44ea87bb0ac6}	t	f	approved	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	2026-01-08 05:48:19.027402	2026-01-07 23:00:00	2026-01-12 16:00:00	f	2026-01-08 05:48:19.09309	2026-01-12 14:00:58.068219	\N	\N
ec5ce484-3c8d-4429-a73b-4b4176efe24f	353909bf-f275-45ec-bb44-54660006d528	Sale		store_wide_sale	percentage	11.00	\N	f	{f4bda4ca-c67e-47a6-94e7-1d6faa750282,24a0d52e-948b-481d-97d7-ab0abc50e710}	t	f	approved	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	2026-01-06 13:52:29.365685	2026-01-06 06:51:00	2026-01-13 06:51:00	f	2026-01-06 13:52:29.430016	2026-01-14 00:17:20.008809	\N	\N
0ea1f091-184c-4d10-a9b1-c45a7127f465	7cc96e9a-bdd8-4602-a880-b690de3f2205	Christmas Sales		discount	percentage	17.00	\N	f	{0a595a84-f3d7-4c82-ad49-0f9586dcecee,c48e69d8-c9dc-44d7-bc27-9cea3dbf44c3}	t	f	approved	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2025-12-24 04:33:31.937627	2025-12-23 21:33:00	2025-12-26 21:33:00	f	2025-12-24 04:33:31.949944	2025-12-31 19:34:46.864847	\N	\N
68bf1194-54be-4ed7-b16c-d25bdf9d6a89	353909bf-f275-45ec-bb44-54660006d528	New Year Special		discount	percentage	33.00	\N	f	{1a796416-b05b-4031-a011-5e0d0bf8d1ae,51d1ac27-df47-45ad-bf50-69765e47f4d3,7a5f7fff-05f1-46f6-a751-2ca44cb060cb}	t	f	approved	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	2025-12-30 00:43:32.176517	2025-12-28 17:43:00	2025-12-31 17:43:00	f	2025-12-30 00:43:32.178268	2025-12-31 19:34:46.864847	\N	\N
8649d10b-374b-409e-bdda-3d6149f5c0d4	7cc96e9a-bdd8-4602-a880-b690de3f2205	Clearance Sale		discount	percentage	20.00	\N	f	{89dedead-8475-4cb0-8974-dac8f302e03f,6ba66080-1de4-48cd-a4b3-c1546f4cdb95}	t	f	approved	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2025-12-24 09:10:26.148594	2025-12-24 09:09:00	2025-12-30 09:09:00	f	2025-12-24 09:10:26.164535	2025-12-31 19:34:46.864847	\N	\N
8f90ca92-7cb6-4cc9-8a7b-5a21dbb855a3	7cc96e9a-bdd8-4602-a880-b690de3f2205	Boxing Day special		discount	percentage	10.00	\N	f	{cf75cee3-46fa-42a1-a3a9-5f884c119692,a94cccc2-62cf-4d7d-9495-d9ce45623b9d,a5e3de84-6651-4e5b-bc60-fc45f3cff8f6}	t	f	approved	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2025-12-22 08:39:46.926466	2025-12-21 02:04:00	2025-12-27 02:04:00	f	2025-12-22 08:04:15.996962	2025-12-31 19:34:46.864847	\N	\N
c44102ab-18cc-42ac-a3a2-cae646f43a9e	353909bf-f275-45ec-bb44-54660006d528	Leaving Soon		discount	percentage	35.00	\N	f	{0d5a2101-5372-4c30-a5ab-ec793f9b50fd,59f5ff26-8954-4425-9ad5-bb19707266ca,2de960c5-cbaf-4efb-b0fc-7aaaa5bf91d2,11f04e5f-2a10-4321-8dc5-6da1da810546,052d7698-727e-4121-8f44-93521e2c657e}	t	f	approved	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	2026-01-01 02:13:48.632658	2026-01-01 02:13:00	2026-02-01 02:13:00	f	2026-01-01 02:13:48.633073	2026-02-04 13:55:51.180999	\N	\N
af1196e1-0971-497b-a4e5-074446c42d6d	7cc96e9a-bdd8-4602-a880-b690de3f2205	new arrivals		discount	percentage	19.00	\N	f	{c888f544-9d9c-4a7e-aa15-c4f6145b1473,a5e3de84-6651-4e5b-bc60-fc45f3cff8f6,9680d06a-594d-400f-a06b-c370f11b59ba}	t	f	approved	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2026-01-04 05:17:04.990425	2026-01-04 12:16:00	2026-01-15 12:16:00	f	2026-01-04 05:17:05.000641	2026-02-05 19:19:05.333501	\N	\N
8db7b765-dbd1-4a87-a5e7-3241880de413	353909bf-f275-45ec-bb44-54660006d528	Anniversary 	First fruits	discount	percentage	5.00	\N	f	{2a9d75d2-8cce-4ea2-9f92-bc7abc276151,472d14c4-fd99-4051-8577-8927aba20ca7,7ee68751-1bc2-4de3-be27-1542c206aff6,8426df32-67a5-4506-a97d-668d5c6c59c7,c3befc6b-40b9-40f2-91ec-7fa268f87002}	t	f	approved	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	2026-01-09 07:17:30.486874	2026-02-06 20:14:00	2026-02-13 20:14:00	t	2026-01-09 07:17:30.488268	2026-02-06 13:14:36.880759	\N	\N
04c69a88-2493-4163-b459-81e9376290cd	7cc96e9a-bdd8-4602-a880-b690de3f2205	Valentine Collaboration	Share the love wherever	discount	percentage	13.00	\N	f	{c888f544-9d9c-4a7e-aa15-c4f6145b1473,a94cccc2-62cf-4d7d-9495-d9ce45623b9d,c48e69d8-c9dc-44d7-bc27-9cea3dbf44c3,6ba66080-1de4-48cd-a4b3-c1546f4cdb95}	t	f	approved	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	2026-01-31 16:58:29.434618	2026-01-31 09:57:00	2026-02-07 09:57:00	f	2026-01-31 16:58:29.477833	2026-02-07 04:49:07.938347	\N	\N
\.


--
-- Data for Name: recipe_ingredients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipe_ingredients (id, recipe_id, product_id, quantity, unit, is_optional, notes, created_at) FROM stdin;
91eb8e63-6a82-42b2-9b43-6f6073227057	9bca7208-dbb3-4fbd-8237-4b1b36341728	24a0d52e-948b-481d-97d7-ab0abc50e710	1.00	kg	f	\N	2026-02-06 18:34:53.010974-07
b24e56ef-325a-47c8-8808-832d7e6d6d5a	9bca7208-dbb3-4fbd-8237-4b1b36341728	59f5ff26-8954-4425-9ad5-bb19707266ca	1.00	bottle	f	\N	2026-02-06 18:34:53.010974-07
\.


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipes (id, name, slug, description, image_url, meal_type, cuisine_type, prep_time_minutes, cook_time_minutes, servings, difficulty, instructions, nutrition_info, is_active, created_at, updated_at, african_region) FROM stdin;
9bca7208-dbb3-4fbd-8237-4b1b36341728	Assorted Test	assorted-test		/api/v1/uploads/recipes/381d494e-db16-47a1-b7ac-eecc0d98b272.jpg	lunch	\N	10	10	1	easy	\N	{}	t	2025-12-29 14:32:21.281732-07	2026-02-06 13:55:36.608185-07	West Africa
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, vendor_id, order_id, customer_id, rating, title, comment, is_verified_purchase, is_public, vendor_response, vendor_response_at, responded_by, is_reported, report_reason, is_abusive, created_at, updated_at, product_id) FROM stdin;
5090f633-e79e-4d0d-8f73-fc0cdcf311fc	7cc96e9a-bdd8-4602-a880-b690de3f2205	\N	3db6156e-97b3-4cf5-8c6c-2af032257531	5	Testing 	this a a product review test	f	t	I'm glad your test worked out well	2025-12-24 06:26:20.431106	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	f	\N	f	2025-12-22 11:13:27.071055	2025-12-23 23:26:20.399468	6ba66080-1de4-48cd-a4b3-c1546f4cdb95
02ad539f-2b5e-44dd-8d73-035d51738ff7	353909bf-f275-45ec-bb44-54660006d528	\N	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	5	my experience	I strongly believe this test is necessary	f	t	You’re welcome 	2026-01-06 07:59:04.017898	96d2fe3d-a90c-45d4-9fe0-2e64611b8946	f	\N	f	2026-01-06 07:58:40.989675	2026-01-06 00:59:03.996591	052d7698-727e-4121-8f44-93521e2c657e
16d05d24-a2a5-4c23-92e8-9f6ccad20dee	7cc96e9a-bdd8-4602-a880-b690de3f2205	\N	defa9c4c-2b18-4a1d-9b49-98b4ac97bf53	3	Tested 	Trusted 	f	t	\N	\N	\N	f	\N	f	2026-02-07 02:12:16.932599	2026-02-07 02:12:16.932608	a94cccc2-62cf-4d7d-9495-d9ce45623b9d
\.


--
-- Data for Name: sales_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales_reports (id, vendor_id, report_type, period_start, period_end, total_orders, total_revenue, total_commission, net_payout, average_order_value, top_products, average_fulfillment_time_minutes, cancellation_rate, generated_at) FROM stdin;
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stores (id, vendor_id, name, store_code, description, street_address, city, state, postal_code, country, latitude, longitude, phone, email, profile_image_url, banner_image_url, store_gallery, store_tags, store_features, specialties, operating_hours, timezone, pickup_available, delivery_available, delivery_radius_km, delivery_fee, free_delivery_threshold, minimum_order_amount, estimated_prep_time_minutes, payment_methods_accepted, accepts_online_payment, accepts_cash_on_delivery, return_policy, cancellation_policy, social_media_links, is_active, is_primary, status, average_rating, total_reviews, region, created_at, updated_at) FROM stdin;
6fec9aa3-27ca-4107-b046-80ca0368ab60	353909bf-f275-45ec-bb44-54660006d528	vibes stores - Main Store		Primary store for vibes stores	785 testos lane	Edmonton	Alberta	T3Y 8U9	United States	\N	\N	746458302	vibes@vmail.com	\N	\N	\N	\N	\N	\N	{"monday": {"open": "09:00", "close": "17:00", "closed": false}, "tuesday": {"open": "09:00", "close": "17:00", "closed": false}, "wednesday": {"open": "09:00", "close": "17:00", "closed": false}, "thursday": {"open": "09:00", "close": "17:00", "closed": false}, "friday": {"open": "09:00", "close": "17:00", "closed": false}, "saturday": {"open": "09:00", "close": "17:00", "closed": false}, "sunday": {"open": "09:00", "close": "17:00", "closed": false}}	UTC	t	t	5.00	0.00	\N	0.00	30	{cash,card}	t	t	\N	\N	\N	t	t	active	0.00	0	\N	2025-12-30 00:13:55.671436	2026-01-07 04:46:52.663166
\.


--
-- Data for Name: support_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.support_messages (id, vendor_id, vendor_user_id, subject, message, status, priority, assigned_to, resolved_at, created_at, updated_at, customer_id, message_type) FROM stdin;
b3e56a39-b2a6-47c9-aeac-3088774e7296	7cc96e9a-bdd8-4602-a880-b690de3f2205	7c6289e8-8add-4dd0-abde-4021fdeeb1ff	New Staff Onboarding	How do I add a new staff	resolved	normal	\N	2025-12-24 05:50:27.056259	2025-12-22 09:49:23.92934	2025-12-24 05:50:27.056289	\N	vendor
\.


--
-- Data for Name: vendor_onboarding_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_onboarding_steps (id, vendor_id, step_name, completed, completed_at, data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vendor_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_users (id, vendor_id, email, password_hash, first_name, last_name, phone, role, is_active, last_login_at, created_at, updated_at) FROM stdin;
7c6289e8-8add-4dd0-abde-4021fdeeb1ff	7cc96e9a-bdd8-4602-a880-b690de3f2205	easy@tmail.com	$2b$12$59D2ToqJOV4bX57JtlQxHumM3//G/hOMvIMV8JXAVPpAAu3gykzGK	David	Ihezue	4038297533	store_owner	t	\N	2025-12-21 08:35:05.137047	2025-12-21 08:35:05.137053
96d2fe3d-a90c-45d4-9fe0-2e64611b8946	353909bf-f275-45ec-bb44-54660006d528	vibes@vmail.com	$2b$12$lqd77zbxgPdapvm0wnz66ehpbNylduFXs7SFeljw818ArcnwPTmGy	Vee	Veronica	746458302	store_owner	t	\N	2025-12-30 00:13:55.647417	2025-12-30 00:13:55.647425
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendors (id, business_name, business_type, email, phone, phone_verified, password_hash, street_address, city, state, postal_code, country, latitude, longitude, business_registration_number, tax_number, government_id_url, business_registration_url, verification_status, verified_at, store_profile_image_url, description, operating_hours, delivery_radius_km, pickup_available, delivery_available, commission_rate, commission_agreement_accepted, commission_agreement_accepted_at, status, go_live_at, bank_account_name, bank_account_number, bank_routing_number, bank_name, average_rating, total_reviews, created_at, updated_at, store_gallery, store_tags, store_features, minimum_order_amount, delivery_fee, free_delivery_threshold, estimated_prep_time_minutes, payment_methods_accepted, return_policy, cancellation_policy, social_media_links, specialties, store_banner_image_url, accepts_online_payment, accepts_cash_on_delivery, region) FROM stdin;
353909bf-f275-45ec-bb44-54660006d528	vibes stores	grocery	vibes@vmail.com	746458302	f	$2b$12$lqd77zbxgPdapvm0wnz66ehpbNylduFXs7SFeljw818ArcnwPTmGy	785 testos lane	Edmonton	Alberta	T3Y 8U9	Canada	\N	\N	\N	\N	\N	\N	verified	2025-12-30 00:45:20.247279		The best raw foods from the heart of Africa 	{"friday": {"open": "09:00", "close": "20:00"}, "monday": {"open": "09:00", "close": "20:00"}, "sunday": {"open": "10:00", "close": "20:00"}, "tuesday": {"open": "09:00", "close": "20:00"}, "saturday": {"open": "09:00", "close": "20:00"}, "thursday": {"open": "09:00", "close": "20:00"}, "wednesday": {"open": "09:00", "close": "20:00"}}	5.00	t	t	10.00	f	\N	active	2025-12-30 00:23:03.612707	\N	\N	\N	\N	5.00	1	2025-12-30 00:13:55.427911	2026-02-05 17:36:49.173915	[]	\N	{}	0.00	0.00	\N	30	{cash,card}	\N	\N	{}	\N	\N	t	t	Central African
7cc96e9a-bdd8-4602-a880-b690de3f2205	easytest	grocery	easy@tmail.com	4038297533	f	$2b$12$59D2ToqJOV4bX57JtlQxHumM3//G/hOMvIMV8JXAVPpAAu3gykzGK	459 African Grocery Avenue	Calgary	Alberta	T2P 1J9	Canada	51.04470000	-114.07190000	\N	\N	\N	\N	verified	2025-12-22 23:09:21.943286		best for prices	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "18:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "09:00", "close": "21:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	5.00	t	t	10.00	f	\N	active	2025-12-21 10:44:01.840665	\N	\N	\N	\N	4.00	2	2025-12-21 08:35:05.133607	2026-02-06 19:12:16.882826	[]	{}	{}	0.00	0.00	\N	30	{cash,card}	\N	\N	{}	\N	\N	t	t	West African
\.


--
-- Name: admin_activity_logs admin_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chef_reviews chef_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chef_reviews
    ADD CONSTRAINT chef_reviews_pkey PRIMARY KEY (id);


--
-- Name: chefs chefs_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chefs
    ADD CONSTRAINT chefs_email_key UNIQUE (email);


--
-- Name: chefs chefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chefs
    ADD CONSTRAINT chefs_pkey PRIMARY KEY (id);


--
-- Name: coupon_usages coupon_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usages
    ADD CONSTRAINT coupon_usages_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: cuisines cuisines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuisines
    ADD CONSTRAINT cuisines_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_allergies customer_allergies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_allergies
    ADD CONSTRAINT customer_allergies_pkey PRIMARY KEY (id);


--
-- Name: customers customers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_email_key UNIQUE (email);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_order_id_key UNIQUE (order_id);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_email_key UNIQUE (email);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: expiry_alerts expiry_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_alerts
    ADD CONSTRAINT expiry_alerts_pkey PRIMARY KEY (id);


--
-- Name: inventory_adjustments inventory_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id);


--
-- Name: low_stock_alerts low_stock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.low_stock_alerts
    ADD CONSTRAINT low_stock_alerts_pkey PRIMARY KEY (id);


--
-- Name: marketing_ab_tests marketing_ab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_ab_tests
    ADD CONSTRAINT marketing_ab_tests_pkey PRIMARY KEY (id);


--
-- Name: marketing_ad_placements marketing_ad_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_ad_placements
    ADD CONSTRAINT marketing_ad_placements_pkey PRIMARY KEY (id);


--
-- Name: marketing_ads marketing_ads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_pkey PRIMARY KEY (id);


--
-- Name: marketing_audiences marketing_audiences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_audiences
    ADD CONSTRAINT marketing_audiences_pkey PRIMARY KEY (id);


--
-- Name: marketing_automation_workflows marketing_automation_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_automation_workflows
    ADD CONSTRAINT marketing_automation_workflows_pkey PRIMARY KEY (id);


--
-- Name: marketing_budgets marketing_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_budgets
    ADD CONSTRAINT marketing_budgets_pkey PRIMARY KEY (id);


--
-- Name: marketing_campaign_analytics marketing_campaign_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaign_analytics
    ADD CONSTRAINT marketing_campaign_analytics_pkey PRIMARY KEY (id);


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: marketing_contacts marketing_contacts_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_contacts
    ADD CONSTRAINT marketing_contacts_email_key UNIQUE (email);


--
-- Name: marketing_contacts marketing_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_contacts
    ADD CONSTRAINT marketing_contacts_pkey PRIMARY KEY (id);


--
-- Name: marketing_content_library marketing_content_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content_library
    ADD CONSTRAINT marketing_content_library_pkey PRIMARY KEY (id);


--
-- Name: marketing_email_campaigns marketing_email_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_email_campaigns
    ADD CONSTRAINT marketing_email_campaigns_pkey PRIMARY KEY (id);


--
-- Name: marketing_email_templates marketing_email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_email_templates
    ADD CONSTRAINT marketing_email_templates_pkey PRIMARY KEY (id);


--
-- Name: marketing_notifications marketing_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_notifications
    ADD CONSTRAINT marketing_notifications_pkey PRIMARY KEY (id);


--
-- Name: marketing_social_media_posts marketing_social_media_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_social_media_posts
    ADD CONSTRAINT marketing_social_media_posts_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payout_items payout_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_items
    ADD CONSTRAINT payout_items_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_payout_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_payout_number_key UNIQUE (payout_number);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_setting_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_setting_type_key UNIQUE (setting_type);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_product_id_variant_name_variant_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_variant_name_variant_value_key UNIQUE (product_id, variant_name, variant_value);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_vendor_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_vendor_id_slug_key UNIQUE (vendor_id, slug);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: recipe_ingredients recipe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id);


--
-- Name: recipe_ingredients recipe_ingredients_recipe_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_recipe_id_product_id_key UNIQUE (recipe_id, product_id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_slug_key UNIQUE (slug);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: sales_reports sales_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT sales_reports_pkey PRIMARY KEY (id);


--
-- Name: sales_reports sales_reports_vendor_id_report_type_period_start_period_end_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT sales_reports_vendor_id_report_type_period_start_period_end_key UNIQUE (vendor_id, report_type, period_start, period_end);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: vendor_onboarding_steps vendor_onboarding_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_onboarding_steps
    ADD CONSTRAINT vendor_onboarding_steps_pkey PRIMARY KEY (id);


--
-- Name: vendor_onboarding_steps vendor_onboarding_steps_vendor_id_step_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_onboarding_steps
    ADD CONSTRAINT vendor_onboarding_steps_vendor_id_step_name_key UNIQUE (vendor_id, step_name);


--
-- Name: vendor_users vendor_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_users
    ADD CONSTRAINT vendor_users_pkey PRIMARY KEY (id);


--
-- Name: vendor_users vendor_users_vendor_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_users
    ADD CONSTRAINT vendor_users_vendor_id_email_key UNIQUE (vendor_id, email);


--
-- Name: vendors vendors_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_email_key UNIQUE (email);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_activity_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_activity_logs_admin_id ON public.admin_activity_logs USING btree (admin_id);


--
-- Name: idx_admin_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_activity_logs_created_at ON public.admin_activity_logs USING btree (created_at);


--
-- Name: idx_admin_activity_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_activity_logs_entity ON public.admin_activity_logs USING btree (entity_type, entity_id);


--
-- Name: idx_admin_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_users_email ON public.admin_users USING btree (email);


--
-- Name: idx_admin_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_users_role ON public.admin_users USING btree (role);


--
-- Name: idx_chef_reviews_chef_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chef_reviews_chef_id ON public.chef_reviews USING btree (chef_id);


--
-- Name: idx_chef_reviews_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chef_reviews_customer_id ON public.chef_reviews USING btree (customer_id);


--
-- Name: idx_chefs_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chefs_city ON public.chefs USING btree (city);


--
-- Name: idx_chefs_cuisines; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chefs_cuisines ON public.chefs USING gin (cuisines);


--
-- Name: idx_chefs_verification_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chefs_verification_status ON public.chefs USING btree (verification_status);


--
-- Name: idx_cuisines_chef_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuisines_chef_id ON public.cuisines USING btree (chef_id);


--
-- Name: idx_cuisines_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuisines_slug ON public.cuisines USING btree (slug);


--
-- Name: idx_cuisines_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuisines_status ON public.cuisines USING btree (status);


--
-- Name: idx_customer_allergies_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_allergies_customer_id ON public.customer_allergies USING btree (customer_id);


--
-- Name: idx_deliveries_driver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_driver_id ON public.deliveries USING btree (driver_id);


--
-- Name: idx_deliveries_last_location_update; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_last_location_update ON public.deliveries USING btree (last_location_update);


--
-- Name: idx_deliveries_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_order_id ON public.deliveries USING btree (order_id);


--
-- Name: idx_deliveries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_status ON public.deliveries USING btree (status);


--
-- Name: idx_deliveries_status_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliveries_status_location ON public.deliveries USING btree (status, current_latitude, current_longitude);


--
-- Name: idx_drivers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drivers_email ON public.drivers USING btree (email);


--
-- Name: idx_drivers_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drivers_is_active ON public.drivers USING btree (is_active);


--
-- Name: idx_drivers_is_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drivers_is_available ON public.drivers USING btree (is_available);


--
-- Name: idx_drivers_verification_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drivers_verification_status ON public.drivers USING btree (verification_status);


--
-- Name: idx_inventory_adjustments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_adjustments_date ON public.inventory_adjustments USING btree (created_at);


--
-- Name: idx_inventory_adjustments_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_adjustments_product ON public.inventory_adjustments USING btree (product_id);


--
-- Name: idx_inventory_adjustments_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_adjustments_store_id ON public.inventory_adjustments USING btree (store_id);


--
-- Name: idx_inventory_adjustments_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_adjustments_vendor ON public.inventory_adjustments USING btree (vendor_id);


--
-- Name: idx_low_stock_alerts_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_low_stock_alerts_resolved ON public.low_stock_alerts USING btree (is_resolved);


--
-- Name: idx_low_stock_alerts_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_low_stock_alerts_vendor ON public.low_stock_alerts USING btree (vendor_id);


--
-- Name: idx_marketing_ad_placements_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_ad_placements_location ON public.marketing_ad_placements USING btree (placement_location);


--
-- Name: idx_marketing_ads_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_ads_approval ON public.marketing_ads USING btree (approval_status);


--
-- Name: idx_marketing_ads_chef_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_ads_chef_id ON public.marketing_ads USING btree (chef_id);


--
-- Name: idx_marketing_ads_placement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_ads_placement ON public.marketing_ads USING btree (placement);


--
-- Name: idx_marketing_ads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_ads_status ON public.marketing_ads USING btree (status);


--
-- Name: idx_marketing_ads_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_ads_vendor ON public.marketing_ads USING btree (vendor_id);


--
-- Name: idx_marketing_analytics_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_analytics_campaign ON public.marketing_campaign_analytics USING btree (campaign_id, date);


--
-- Name: idx_marketing_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns USING btree (status);


--
-- Name: idx_marketing_campaigns_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_campaigns_vendor ON public.marketing_campaigns USING btree (vendor_id);


--
-- Name: idx_marketing_email_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_email_campaigns_status ON public.marketing_email_campaigns USING btree (status);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (vendor_user_id);


--
-- Name: idx_notifications_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_vendor ON public.notifications USING btree (vendor_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_chef_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_chef_id ON public.orders USING btree (chef_id);


--
-- Name: idx_orders_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created ON public.orders USING btree (created_at);


--
-- Name: idx_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_store_id ON public.orders USING btree (store_id);


--
-- Name: idx_orders_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_vendor ON public.orders USING btree (vendor_id);


--
-- Name: idx_payouts_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_period ON public.payouts USING btree (period_start, period_end);


--
-- Name: idx_payouts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_status ON public.payouts USING btree (status);


--
-- Name: idx_payouts_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_vendor ON public.payouts USING btree (vendor_id);


--
-- Name: idx_products_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_barcode ON public.products USING btree (barcode);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_products_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_store_id ON public.products USING btree (store_id);


--
-- Name: idx_products_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_vendor ON public.products USING btree (vendor_id);


--
-- Name: idx_promotions_chef_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promotions_chef_id ON public.promotions USING btree (chef_id);


--
-- Name: idx_recipe_ingredients_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipe_ingredients_product_id ON public.recipe_ingredients USING btree (product_id);


--
-- Name: idx_recipe_ingredients_recipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients USING btree (recipe_id);


--
-- Name: idx_recipes_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_is_active ON public.recipes USING btree (is_active);


--
-- Name: idx_recipes_meal_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_meal_type ON public.recipes USING btree (meal_type);


--
-- Name: idx_recipes_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_slug ON public.recipes USING btree (slug);


--
-- Name: idx_reviews_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_order ON public.reviews USING btree (order_id);


--
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_vendor ON public.reviews USING btree (vendor_id);


--
-- Name: idx_support_messages_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_customer_id ON public.support_messages USING btree (customer_id);


--
-- Name: idx_support_messages_message_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_message_type ON public.support_messages USING btree (message_type);


--
-- Name: idx_vendor_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_users_role ON public.vendor_users USING btree (role);


--
-- Name: idx_vendor_users_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_users_vendor ON public.vendor_users USING btree (vendor_id);


--
-- Name: idx_vendors_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_city ON public.vendors USING btree (city);


--
-- Name: idx_vendors_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_email ON public.vendors USING btree (email);


--
-- Name: idx_vendors_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_location ON public.vendors USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_vendors_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_status ON public.vendors USING btree (status);


--
-- Name: idx_vendors_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_tags ON public.vendors USING gin (store_tags);


--
-- Name: idx_vendors_verification_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_verification_status ON public.vendors USING btree (verification_status);


--
-- Name: ix_coupons_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_coupons_code ON public.coupons USING btree (code);


--
-- Name: products check_low_stock_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_low_stock_trigger AFTER INSERT OR UPDATE OF stock_quantity ON public.products FOR EACH ROW EXECUTE FUNCTION public.check_low_stock();


--
-- Name: deliveries trigger_update_delivery_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_delivery_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_delivery_updated_at();


--
-- Name: drivers trigger_update_driver_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_driver_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_driver_updated_at();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payouts update_payouts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: promotions update_promotions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recipes update_recipes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_recipe_updated_at();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_vendor_rating_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendor_rating_trigger AFTER INSERT OR DELETE OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_vendor_rating();


--
-- Name: vendor_users update_vendor_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendor_users_updated_at BEFORE UPDATE ON public.vendor_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors update_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_activity_logs admin_activity_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: chef_reviews chef_reviews_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chef_reviews
    ADD CONSTRAINT chef_reviews_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chefs(id) ON DELETE CASCADE;


--
-- Name: chef_reviews chef_reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chef_reviews
    ADD CONSTRAINT chef_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: chefs chefs_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chefs
    ADD CONSTRAINT chefs_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.admin_users(id);


--
-- Name: coupon_usages coupon_usages_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usages
    ADD CONSTRAINT coupon_usages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id);


--
-- Name: coupon_usages coupon_usages_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usages
    ADD CONSTRAINT coupon_usages_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: coupon_usages coupon_usages_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usages
    ADD CONSTRAINT coupon_usages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: cuisines cuisines_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuisines
    ADD CONSTRAINT cuisines_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chefs(id) ON DELETE CASCADE;


--
-- Name: customer_addresses customer_addresses_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_allergies customer_allergies_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_allergies
    ADD CONSTRAINT customer_allergies_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: expiry_alerts expiry_alerts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_alerts
    ADD CONSTRAINT expiry_alerts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: expiry_alerts expiry_alerts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_alerts
    ADD CONSTRAINT expiry_alerts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: inventory_adjustments inventory_adjustments_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.vendor_users(id);


--
-- Name: inventory_adjustments inventory_adjustments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory_adjustments inventory_adjustments_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_adjustments inventory_adjustments_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: low_stock_alerts low_stock_alerts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.low_stock_alerts
    ADD CONSTRAINT low_stock_alerts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: low_stock_alerts low_stock_alerts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.low_stock_alerts
    ADD CONSTRAINT low_stock_alerts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: marketing_ab_tests marketing_ab_tests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_ab_tests
    ADD CONSTRAINT marketing_ab_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_ad_placements marketing_ad_placements_ad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_ad_placements
    ADD CONSTRAINT marketing_ad_placements_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.marketing_ads(id);


--
-- Name: marketing_ads marketing_ads_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_ads marketing_ads_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id);


--
-- Name: marketing_ads marketing_ads_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chefs(id);


--
-- Name: marketing_ads marketing_ads_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_ads
    ADD CONSTRAINT marketing_ads_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: marketing_audiences marketing_audiences_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_audiences
    ADD CONSTRAINT marketing_audiences_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_automation_workflows marketing_automation_workflows_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_automation_workflows
    ADD CONSTRAINT marketing_automation_workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_budgets marketing_budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_budgets
    ADD CONSTRAINT marketing_budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_campaign_analytics marketing_campaign_analytics_ad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaign_analytics
    ADD CONSTRAINT marketing_campaign_analytics_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.marketing_ads(id);


--
-- Name: marketing_campaign_analytics marketing_campaign_analytics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaign_analytics
    ADD CONSTRAINT marketing_campaign_analytics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id);


--
-- Name: marketing_campaign_analytics marketing_campaign_analytics_email_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaign_analytics
    ADD CONSTRAINT marketing_campaign_analytics_email_campaign_id_fkey FOREIGN KEY (email_campaign_id) REFERENCES public.marketing_email_campaigns(id);


--
-- Name: marketing_campaigns marketing_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_campaigns marketing_campaigns_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: marketing_contacts marketing_contacts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_contacts
    ADD CONSTRAINT marketing_contacts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_contacts marketing_contacts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_contacts
    ADD CONSTRAINT marketing_contacts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: marketing_content_library marketing_content_library_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content_library
    ADD CONSTRAINT marketing_content_library_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_email_campaigns marketing_email_campaigns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_email_campaigns
    ADD CONSTRAINT marketing_email_campaigns_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id);


--
-- Name: marketing_email_campaigns marketing_email_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_email_campaigns
    ADD CONSTRAINT marketing_email_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_email_campaigns marketing_email_campaigns_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_email_campaigns
    ADD CONSTRAINT marketing_email_campaigns_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: marketing_email_templates marketing_email_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_email_templates
    ADD CONSTRAINT marketing_email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_notifications marketing_notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_notifications
    ADD CONSTRAINT marketing_notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: marketing_social_media_posts marketing_social_media_posts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_social_media_posts
    ADD CONSTRAINT marketing_social_media_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


--
-- Name: notifications notifications_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_vendor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_vendor_user_id_fkey FOREIGN KEY (vendor_user_id) REFERENCES public.vendor_users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_cuisine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_cuisine_id_fkey FOREIGN KEY (cuisine_id) REFERENCES public.cuisines(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_original_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_original_product_id_fkey FOREIGN KEY (original_product_id) REFERENCES public.products(id);


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.vendor_users(id);


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.vendor_users(id);


--
-- Name: orders orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.vendor_users(id);


--
-- Name: orders orders_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chefs(id) ON DELETE SET NULL;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: orders orders_delivery_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_address_id_fkey FOREIGN KEY (delivery_address_id) REFERENCES public.customer_addresses(id);


--
-- Name: orders orders_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: orders orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: orders orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: payout_items payout_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_items
    ADD CONSTRAINT payout_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: payout_items payout_items_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_items
    ADD CONSTRAINT payout_items_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.payouts(id) ON DELETE CASCADE;


--
-- Name: payouts payouts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_parent_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_parent_product_id_fkey FOREIGN KEY (parent_product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: products products_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: promotions promotions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.vendor_users(id);


--
-- Name: promotions promotions_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chefs(id) ON DELETE SET NULL;


--
-- Name: promotions promotions_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: recipe_ingredients recipe_ingredients_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: recipe_ingredients recipe_ingredients_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.vendor_users(id);


--
-- Name: reviews reviews_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: sales_reports sales_reports_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT sales_reports_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: stores stores_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: support_messages support_messages_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: support_messages support_messages_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: support_messages support_messages_vendor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_vendor_user_id_fkey FOREIGN KEY (vendor_user_id) REFERENCES public.vendor_users(id);


--
-- Name: vendor_onboarding_steps vendor_onboarding_steps_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_onboarding_steps
    ADD CONSTRAINT vendor_onboarding_steps_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_users vendor_users_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_users
    ADD CONSTRAINT vendor_users_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7zF6Z0zN8KYhOaldvAXvImp0Mqo1cULco8WduRw9zKJBXFXnD2ktHubOqVj6ZRL

