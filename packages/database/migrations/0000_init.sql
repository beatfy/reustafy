-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure clean rebuild on re-migration
DROP TABLE IF EXISTS register_closings CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop existing types if they exist (clean setup)
DROP TYPE IF EXISTS subscription_tier_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS table_zone_enum CASCADE;
DROP TYPE IF EXISTS table_status_enum CASCADE;
DROP TYPE IF EXISTS order_status_enum CASCADE;
DROP TYPE IF EXISTS order_item_status_enum CASCADE;
DROP TYPE IF EXISTS reservation_status_enum CASCADE;

-- Custom Enums
CREATE TYPE subscription_tier_enum AS ENUM ('basic', 'medium', 'premium');
CREATE TYPE user_role_enum AS ENUM ('admin', 'manager', 'waiter', 'kitchen');
CREATE TYPE table_zone_enum AS ENUM ('salon', 'terrace', 'bar');
CREATE TYPE table_status_enum AS ENUM ('free', 'ordered', 'eating', 'bill', 'reserved');
CREATE TYPE order_status_enum AS ENUM ('pending', 'cooking', 'served', 'paid');
CREATE TYPE order_item_status_enum AS ENUM ('pending', 'cooking', 'served');
CREATE TYPE reservation_status_enum AS ENUM ('pending', 'confirmed', 'cancelled', 'seated');

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subscription_tier subscription_tier_enum NOT NULL DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'waiter',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tables Table
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    zone table_zone_enum NOT NULL DEFAULT 'salon',
    status table_status_enum NOT NULL DEFAULT 'free',
    capacity INTEGER NOT NULL DEFAULT 4,
    UNIQUE (tenant_id, table_number)
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    waiter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status order_status_enum NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, -- Included to enforce RLS easily
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0.00),
    status order_item_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    reservation_time TIMESTAMP WITH TIME ZONE NOT NULL,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    status reservation_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Optimization
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tables_tenant ON tables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON activity_logs(tenant_id);

-- Enable Row Level Security (RLS) on all tenant-dependent tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (makes migration re-runnable)
DROP POLICY IF EXISTS tenant_isolation_tenants_policy ON tenants;
DROP POLICY IF EXISTS tenant_isolation_users_policy ON users;
DROP POLICY IF EXISTS tenant_isolation_tables_policy ON tables;
DROP POLICY IF EXISTS tenant_isolation_orders_policy ON orders;
DROP POLICY IF EXISTS tenant_isolation_order_items_policy ON order_items;
DROP POLICY IF EXISTS tenant_isolation_reservations_policy ON reservations;
DROP POLICY IF EXISTS tenant_isolation_activity_logs_policy ON activity_logs;

-- Define RLS Policies using session context variable 'app.current_tenant_id'
-- We allow RLS bypass if 'app.bypass_rls' is set to 'true' for authentication / system management queries
CREATE POLICY tenant_isolation_tenants_policy ON tenants
    FOR ALL USING (
        id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR current_setting('app.bypass_rls', true) = 'true'
    );

CREATE POLICY tenant_isolation_users_policy ON users
    FOR ALL USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR current_setting('app.bypass_rls', true) = 'true'
    );

CREATE POLICY tenant_isolation_tables_policy ON tables
    FOR ALL USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR current_setting('app.bypass_rls', true) = 'true'
    );

CREATE POLICY tenant_isolation_orders_policy ON orders
    FOR ALL USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR current_setting('app.bypass_rls', true) = 'true'
    );

CREATE POLICY tenant_isolation_order_items_policy ON order_items
    FOR ALL USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR current_setting('app.bypass_rls', true) = 'true'
    );

CREATE POLICY tenant_isolation_reservations_policy ON reservations
    FOR ALL USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR current_setting('app.bypass_rls', true) = 'true'
    );

CREATE POLICY tenant_isolation_activity_logs_policy ON activity_logs
    FOR ALL USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ==========================================
-- SEED DATA (Bypass RLS during seed since we execute as superuser/no session context)
-- ==========================================

-- Seed Tenants (Hex valid UUIDs)
INSERT INTO tenants (id, name, subscription_tier) VALUES
('a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'Don Curro (Basic Tenant)', 'basic')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, name, subscription_tier) VALUES
('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2', 'Le Gourmet Franchise (Premium Tenant)', 'premium')
ON CONFLICT (id) DO NOTHING;

-- Seed Users (Passwords are 'password123' BCrypt-hashed: '$2a$10$6S30wILiammW//20yvTOlep.gULuf2NAu5qPyaMSUg0arbW9tHtG2')
-- Basic Tenant Users (c0e... are hex valid UUIDs)
INSERT INTO users (id, tenant_id, name, email, password_hash, role, active) VALUES
('c0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'Carlos Admin', 'carlos@doncurro.com', '$2a$10$6S30wILiammW//20yvTOlep.gULuf2NAu5qPyaMSUg0arbW9tHtG2', 'admin', true),
('c0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e2', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'Juan Waiter', 'juan@doncurro.com', '$2a$10$6S30wILiammW//20yvTOlep.gULuf2NAu5qPyaMSUg0arbW9tHtG2', 'waiter', true),
('c0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e3', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'Marta Kitchen', 'marta@doncurro.com', '$2a$10$6S30wILiammW//20yvTOlep.gULuf2NAu5qPyaMSUg0arbW9tHtG2', 'kitchen', true)
ON CONFLICT (id) DO NOTHING;

-- Premium Tenant Users (f0b... are hex valid UUIDs)
INSERT INTO users (id, tenant_id, name, email, password_hash, role, active) VALUES
('f0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b1', 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2', 'Sophia Owner', 'sophia@legourmet.com', '$2a$10$6S30wILiammW//20yvTOlep.gULuf2NAu5qPyaMSUg0arbW9tHtG2', 'admin', true),
('f0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2', 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2', 'Pedro Waiter', 'pedro@legourmet.com', '$2a$10$6S30wILiammW//20yvTOlep.gULuf2NAu5qPyaMSUg0arbW9tHtG2', 'waiter', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Tables for Tenant A (Basic) (d0e... are hex valid UUIDs)
INSERT INTO tables (id, tenant_id, table_number, zone, status, capacity) VALUES
('d0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', '1', 'salon', 'free', 4),
('d0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a002', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', '2', 'salon', 'ordered', 2),
('d0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a003', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', '3', 'terrace', 'eating', 6),
('d0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a004', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', '4', 'terrace', 'bill', 4),
('d0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a005', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'T1', 'bar', 'free', 2)
ON CONFLICT (id) DO NOTHING;

-- Seed Tables for Tenant B (Premium) (d0b... are hex valid UUIDs)
INSERT INTO tables (id, tenant_id, table_number, zone, status, capacity) VALUES
('d0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b001', 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2', '101', 'salon', 'free', 4),
('d0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b002', 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2', '102', 'salon', 'eating', 4),
('d0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b003', 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2', 'V1', 'terrace', 'free', 2)
ON CONFLICT (id) DO NOTHING;

-- Seed Orders and Items for Tenant A (e0e... and 10e... are hex valid UUIDs)
INSERT INTO orders (id, tenant_id, table_id, waiter_id, status, total_amount) VALUES
('e0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'd0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a002', 'c0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e2', 'pending', 34.50),
('e0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a002', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'd0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a003', 'c0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e2', 'cooking', 42.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, tenant_id, order_id, item_name, quantity, price, status) VALUES
('10e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'e0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'Patatas Bravas', 2, 6.50, 'pending'),
('10e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a002', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'e0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'Solomillo al Whisky', 1, 14.50, 'pending'),
('10e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a003', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'e0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'Caña Cruzcampo', 3, 2.30, 'served'),
('10e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a004', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'e0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a002', 'Hamburguesa Gourmet', 3, 14.00, 'cooking')
ON CONFLICT (id) DO NOTHING;

-- Seed Reservations for Tenant A (80e... are hex valid UUIDs)
INSERT INTO reservations (id, tenant_id, customer_name, customer_email, customer_phone, party_size, reservation_time, table_id, status) VALUES
('80e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'Lucía Pérez', 'lucia@gmail.com', '+34600112233', 4, CURRENT_TIMESTAMP + INTERVAL '2 hours', 'd0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'pending'),
('80e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a002', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'Marcos Gómez', 'marcos@hotmail.com', '+34611223344', 2, CURRENT_TIMESTAMP + INTERVAL '4 hours', NULL, 'pending')
ON CONFLICT (id) DO NOTHING;

-- Seed Activity Logs for Tenant A (90e... are hex valid UUIDs)
INSERT INTO activity_logs (id, tenant_id, user_id, action_description) VALUES
('90e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'c0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e2', 'Juan Waiter creó la comanda en Mesa 2'),
('90e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a002', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'c0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e2', 'Juan Waiter sirvió 3 Caña Cruzcampo en Mesa 2')
ON CONFLICT (id) DO NOTHING;
