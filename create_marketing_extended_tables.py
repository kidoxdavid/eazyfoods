"""
Create marketing extended tables (audiences, AB tests, social media, etc.)
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/eazyfoods")

def create_tables():
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    try:
        # Marketing Audiences
        cur.execute("""
            CREATE TABLE IF NOT EXISTS marketing_audiences (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                description TEXT,
                criteria JSONB,
                size INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # AB Tests
        cur.execute("""
            CREATE TABLE IF NOT EXISTS marketing_ab_tests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                description TEXT,
                test_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'draft',
                variant_a_id UUID,
                variant_b_id UUID,
                variant_a_name VARCHAR(100) NOT NULL,
                variant_b_name VARCHAR(100) NOT NULL,
                variant_a_conversions INTEGER DEFAULT 0,
                variant_b_conversions INTEGER DEFAULT 0,
                variant_a_conversion_rate DECIMAL(5,2) DEFAULT 0.0,
                variant_b_conversion_rate DECIMAL(5,2) DEFAULT 0.0,
                winner VARCHAR(1),
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Social Media Posts
        cur.execute("""
            CREATE TABLE IF NOT EXISTS marketing_social_media_posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                platform VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                image_url VARCHAR(500),
                video_url VARCHAR(500),
                link_url VARCHAR(500),
                status VARCHAR(20) DEFAULT 'draft',
                scheduled_at TIMESTAMP,
                published_at TIMESTAMP,
                likes INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Notifications (SMS/Push)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS marketing_notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                type VARCHAR(20) NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'draft',
                scheduled_at TIMESTAMP,
                sent_at TIMESTAMP,
                recipient_count INTEGER DEFAULT 0,
                sent_count INTEGER DEFAULT 0,
                delivered_count INTEGER DEFAULT 0,
                opened_count INTEGER DEFAULT 0,
                clicked_count INTEGER DEFAULT 0,
                target_audience JSONB,
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Automation Workflows
        cur.execute("""
            CREATE TABLE IF NOT EXISTS marketing_automation_workflows (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'draft',
                trigger_type VARCHAR(50) NOT NULL,
                trigger_config JSONB,
                actions JSONB,
                conditions JSONB,
                active_instances INTEGER DEFAULT 0,
                total_executions INTEGER DEFAULT 0,
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Marketing Budgets
        cur.execute("""
            CREATE TABLE IF NOT EXISTS marketing_budgets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                description TEXT,
                total_budget DECIMAL(10,2) NOT NULL,
                spent DECIMAL(10,2) DEFAULT 0.0,
                remaining DECIMAL(10,2),
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Contacts/Leads
        cur.execute("""
            CREATE TABLE IF NOT EXISTS marketing_contacts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                phone VARCHAR(20),
                company VARCHAR(200),
                job_title VARCHAR(100),
                lead_score INTEGER DEFAULT 0,
                lead_status VARCHAR(50) DEFAULT 'new',
                properties JSONB,
                tags JSONB,
                last_contacted_at TIMESTAMP,
                last_email_opened_at TIMESTAMP,
                last_email_clicked_at TIMESTAMP,
                source VARCHAR(100),
                customer_id UUID REFERENCES customers(id),
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Content Library
        cur.execute("""
            CREATE TABLE IF NOT EXISTS marketing_content_library (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                description TEXT,
                content_type VARCHAR(50) NOT NULL,
                file_url VARCHAR(500),
                thumbnail_url VARCHAR(500),
                file_size INTEGER,
                mime_type VARCHAR(100),
                tags JSONB,
                category VARCHAR(100),
                is_public BOOLEAN DEFAULT FALSE,
                usage_count INTEGER DEFAULT 0,
                created_by UUID REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_marketing_audiences_created_by ON marketing_audiences(created_by)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_marketing_ab_tests_status ON marketing_ab_tests(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_marketing_social_platform ON marketing_social_media_posts(platform)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_marketing_notifications_type ON marketing_notifications(type)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_marketing_contacts_email ON marketing_contacts(email)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_marketing_contacts_lead_status ON marketing_contacts(lead_status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_marketing_budgets_status ON marketing_budgets(status)")
        
        print("Marketing extended tables created successfully!")
        
    except Exception as e:
        print(f"Error creating tables: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_tables()

