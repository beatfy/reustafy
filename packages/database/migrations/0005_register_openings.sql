-- 0005_register_openings.sql

CREATE TABLE IF NOT EXISTS "register_openings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "opening_amount" numeric(10, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

-- Enable RLS on register_openings
ALTER TABLE "register_openings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "register_openings"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
