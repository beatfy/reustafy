-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy for expenses
CREATE POLICY tenant_expenses_isolation ON expenses
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 2. Alter tables table to support joining
ALTER TABLE tables ADD COLUMN IF NOT EXISTS joined_with_table_id UUID REFERENCES tables(id) ON DELETE SET NULL;
