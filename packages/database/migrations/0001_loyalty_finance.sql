-- 1. Customers Table (Loyalty & preferences)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    points INTEGER NOT NULL DEFAULT 0,
    allergies VARCHAR(255),
    preferences TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, email)
);

-- 2. Register Closings Table (Arqueos de caja)
CREATE TABLE IF NOT EXISTS register_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expected_amount DECIMAL(10, 2) NOT NULL,
    actual_amount DECIMAL(10, 2) NOT NULL,
    discrepancy DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE register_closings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (makes migration re-runnable)
DROP POLICY IF EXISTS tenant_isolation_customers_policy ON customers;
DROP POLICY IF EXISTS tenant_isolation_closings_policy ON register_closings;

-- Define Policies
CREATE POLICY tenant_isolation_customers_policy ON customers
    FOR ALL USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR current_setting('app.bypass_rls', true) = 'true'
    );

CREATE POLICY tenant_isolation_closings_policy ON register_closings
    FOR ALL USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Seed Initial Loyalty Customers (Tenant A: Basic, Tenant B: Premium)
-- Basic Tenant Customers (a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1)
INSERT INTO customers (id, tenant_id, name, email, phone, points, allergies, preferences) VALUES
('c0f0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a001', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'Manuel López', 'manuel@gmail.com', '+34600000001', 120, 'Marisco', 'Prefiere comer en la terraza'),
('c0f0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a002', 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1', 'Ana Ruiz', 'ana@gmail.com', '+34600000002', 45, 'Gluten', 'Pide siempre Solomillo')
ON CONFLICT (id) DO NOTHING;

-- Premium Tenant Customers (b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2)
INSERT INTO customers (id, tenant_id, name, email, phone, points, allergies, preferences) VALUES
('c0f0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b001', 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2', 'David Beck', 'david@gmail.com', '+44700000001', 340, NULL, 'Vino tinto preferido: Vega Sicilia')
ON CONFLICT (id) DO NOTHING;
