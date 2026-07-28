-- 0004_menu_and_fixed_costs.sql

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "categories"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');

-- 2. Create menu_items table
CREATE TABLE IF NOT EXISTS "menu_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "item_name" varchar(255) NOT NULL,
  "description" text,
  "price" numeric(10, 2) NOT NULL,
  "available" boolean NOT NULL DEFAULT true,
  "allergens" varchar(255),
  "created_at" timestamp with time zone DEFAULT now()
);

-- Enable RLS on menu_items
ALTER TABLE "menu_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "menu_items"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');

-- 3. Create tenant_fixed_costs table
CREATE TABLE IF NOT EXISTS "tenant_fixed_costs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "monthly_amount" numeric(10, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

-- Enable RLS on tenant_fixed_costs
ALTER TABLE "tenant_fixed_costs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "tenant_fixed_costs"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');

-- 4. Update users email unique constraint to tenant-scoped
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_email_idx" ON "users" ("tenant_id", "email");
