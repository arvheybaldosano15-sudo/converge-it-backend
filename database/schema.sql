-- ============================================================
-- Converge IT Solutions - Mobile Ticketing System
-- PostgreSQL Database Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================ 
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'technician');
CREATE TYPE user_status AS ENUM ('active', 'pending', 'inactive', 'rejected');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_category AS ENUM ('starlink_internet', 'cctv_system', 'smart_devices', 'installation', 'other');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE notification_type AS ENUM ('ticket_created', 'ticket_assigned', 'ticket_updated', 'ticket_resolved', 'technician_approved', 'technician_rejected', 'new_message', 'system');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'assign', 'resolve', 'close');

-- ============================================================
-- USERS TABLE (Administrators and Technicians)
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255),
    pin_index VARCHAR(64),
    pin_attempts INTEGER DEFAULT 0,
    pin_locked_until TIMESTAMPTZ,
    role user_role NOT NULL DEFAULT 'technician',
    status user_status NOT NULL DEFAULT 'pending',
    contact_number VARCHAR(20),
    address TEXT,
    profile_image_url TEXT,
    specialization VARCHAR(255),
    department VARCHAR(255),
    is_first_login BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS TABLE (Created via Messenger integration)
-- ============================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    messenger_id VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    contact_number VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug ticket_category NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    sla_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TICKETS TABLE
-- ============================================================

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    ai_priority ticket_priority,
    ai_eta_hours INTEGER,
    ai_confidence DECIMAL(5,2),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    customer_address TEXT,
    scheduled_date TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    sla_due_at TIMESTAMPTZ,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES tickets(id) ON DELETE SET NULL,
    escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMPTZ,
    tags TEXT[],
    internal_notes TEXT,
    resolution_summary TEXT,
    customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TICKET UPDATES TABLE
-- ============================================================

CREATE TABLE ticket_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    previous_status ticket_status,
    new_status ticket_status,
    previous_priority ticket_priority,
    new_priority ticket_priority,
    previous_assignee UUID REFERENCES users(id) ON DELETE SET NULL,
    new_assignee UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVICE REPORTS TABLE
-- ============================================================

CREATE TABLE service_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    report_number VARCHAR(30) UNIQUE,
    title VARCHAR(255),
    work_performed TEXT,
    materials_used TEXT,
    completion_notes TEXT,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    gps_address TEXT,
    images_urls TEXT[],
    signature_url TEXT,
    customer_name_signed VARCHAR(255),
    work_start_time TIMESTAMPTZ,
    work_end_time TIMESTAMPTZ,
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES TABLE (Messenger conversations)
-- ============================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    messenger_message_id VARCHAR(255) UNIQUE,
    direction message_direction NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    content TEXT,
    attachments JSONB,
    is_bot_message BOOLEAN DEFAULT FALSE,
    bot_intent VARCHAR(100),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KNOWLEDGE BASE TABLE
-- ============================================================

CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    tags TEXT[],
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    actor_role user_role,
    action audit_action NOT NULL,
    target_type VARCHAR(100),
    target_id UUID,
    target_description VARCHAR(500),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI RECOMMENDATIONS TABLE
-- ============================================================

CREATE TABLE ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    suggestion TEXT NOT NULL,
    reasoning TEXT,
    confidence DECIMAL(5,2),
    is_applied BOOLEAN DEFAULT FALSE,
    applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FEEDBACK TABLE
-- ============================================================

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHATBOT SESSIONS TABLE
-- ============================================================

CREATE TABLE chatbot_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    messenger_id VARCHAR(255) NOT NULL,
    current_step VARCHAR(100) DEFAULT 'greeting',
    collected_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    ticket_created BOOLEAN DEFAULT FALSE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_employee_id ON users(employee_id);

CREATE INDEX idx_customers_messenger_id ON customers(messenger_id);
CREATE INDEX idx_customers_contact ON customers(contact_number);

CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_category ON tickets(category_id);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX idx_tickets_sla ON tickets(sla_due_at);

CREATE INDEX idx_messages_customer ON messages(customer_id);
CREATE INDEX idx_messages_ticket ON messages(ticket_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);

CREATE INDEX idx_kb_category ON knowledge_base(category_id);
CREATE INDEX idx_kb_published ON knowledge_base(is_published);
CREATE INDEX idx_kb_slug ON knowledge_base(slug);

CREATE INDEX idx_chatbot_messenger ON chatbot_sessions(messenger_id);
CREATE INDEX idx_chatbot_active ON chatbot_sessions(is_active);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_service_reports_updated_at BEFORE UPDATE ON service_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_chatbot_sessions_updated_at BEFORE UPDATE ON chatbot_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate ticket numbers: CIT-2024-00001
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    seq_num INTEGER;
    new_ticket_num TEXT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) + 1 INTO seq_num FROM tickets WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    new_ticket_num := 'CIT-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
    NEW.ticket_number := new_ticket_num;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
    EXECUTE FUNCTION generate_ticket_number();

-- Auto-generate service report numbers
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TRIGGER AS $$
DECLARE
    seq_num INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO seq_num FROM service_reports;
    NEW.report_number := 'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_report_number
    BEFORE INSERT ON service_reports
    FOR EACH ROW
    WHEN (NEW.report_number IS NULL OR NEW.report_number = '')
    EXECUTE FUNCTION generate_report_number();

-- Set response timestamps automatically
CREATE OR REPLACE FUNCTION set_ticket_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'open' AND NEW.status != 'open' AND NEW.first_response_at IS NULL THEN
        NEW.first_response_at := NOW();
    END IF;
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' AND NEW.resolved_at IS NULL THEN
        NEW.resolved_at := NOW();
    END IF;
    IF NEW.status = 'closed' AND OLD.status != 'closed' AND NEW.closed_at IS NULL THEN
        NEW.closed_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ticket_timestamps BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION set_ticket_timestamps();

-- Auto-set SLA due date on ticket creation
CREATE OR REPLACE FUNCTION set_sla_due_date()
RETURNS TRIGGER AS $$
DECLARE
    sla_hours INTEGER;
BEGIN
    SELECT c.sla_hours INTO sla_hours FROM categories c WHERE c.id = NEW.category_id;
    IF sla_hours IS NULL THEN
        sla_hours := CASE NEW.priority
            WHEN 'critical' THEN 4
            WHEN 'high' THEN 8
            WHEN 'medium' THEN 24
            ELSE 72
        END;
    END IF;
    NEW.sla_due_at := NOW() + (sla_hours || ' hours')::INTERVAL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_sla BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION set_sla_due_date();

-- ============================================================
-- DEFAULT CATEGORIES
-- ============================================================

INSERT INTO categories (name, slug, description, icon, color, sla_hours) VALUES
('Starlink Internet', 'starlink_internet', 'Issues related to Starlink satellite internet service, connectivity problems, and service interruptions', 'Wifi', '#3b82f6', 8),
('CCTV System', 'cctv_system', 'CCTV camera malfunctions, DVR/NVR issues, recording problems, and surveillance system maintenance', 'Camera', '#8b5cf6', 12),
('Smart Devices', 'smart_devices', 'Smart home device issues, IoT device configuration, firmware updates, and device connectivity', 'Cpu', '#06b6d4', 16),
('Installation', 'installation', 'New service installation requests for internet, CCTV, or smart device systems', 'Wrench', '#f59e0b', 24),
('Other', 'other', 'General inquiries and concerns not covered by specific categories', 'HelpCircle', '#6b7280', 48);

-- ============================================================
-- DEFAULT SYSTEM SETTINGS
-- ============================================================

INSERT INTO system_settings (key, value, description, is_public) VALUES
('company_name', 'Converge IT Solutions', 'Company name displayed throughout the application', true),
('company_email', 'support@convergeit.com', 'Primary support email address', true),
('company_phone', '+63 2 8XXX XXXX', 'Primary contact number', true),
('company_address', 'Philippines', 'Company headquarters address', true),
('max_file_upload_size', '10', 'Maximum file upload size in MB', false),
('ticket_auto_close_days', '7', 'Days after resolution to auto-close tickets', false),
('sla_warning_hours', '2', 'Hours before SLA breach to send warning notification', false),
('ai_enabled', 'true', 'Enable or disable AI features', false),
('messenger_enabled', 'true', 'Enable or disable Messenger integration', false),
('maintenance_mode', 'false', 'Put system in maintenance mode', false);

-- ============================================================
-- DEFAULT ADMINISTRATOR ACCOUNT
-- Email: admin@convergeit.com
-- Password: Admin@Converge2024!
-- IMPORTANT: Change this password on first login!
-- ============================================================

INSERT INTO users (
    employee_id, full_name, email, password_hash, role, status, is_first_login
) VALUES (
    'ADMIN-001',
    'System Administrator',
    'admin@convergeit.com',
    crypt('Admin@Converge2024!', gen_salt('bf', 12)),
    'admin',
    'active',
    TRUE
);
