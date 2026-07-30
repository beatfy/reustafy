import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

export * from './schema';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString?: string) {
  if (!db) {
    const connStr = connectionString || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reustafy';
    pool = new Pool({
      connectionString: connStr,
      ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    db = drizzle(pool, { schema });

    // Auto-ensure new tables and columns exist in PostgreSQL
    pool.query(`
      DO $$ BEGIN
          CREATE TYPE unit_type_enum AS ENUM ('liter', 'piece', 'kg', 'unit');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
          CREATE TYPE shift_enum AS ENUM ('midday', 'night');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
          CREATE TYPE payment_method_enum AS ENUM ('cash', 'card', 'mixed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
          CREATE TYPE course_enum AS ENUM ('starter', 'first', 'second', 'dessert', 'coffee', 'drink');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      -- Update tables
      ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "pos_x" integer DEFAULT 0 NOT NULL;
      ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "pos_y" integer DEFAULT 0 NOT NULL;

      -- Update orders
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "is_internal" boolean DEFAULT false NOT NULL;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shift" shift_enum DEFAULT 'midday' NOT NULL;

      -- Update order_items
      ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "course" course_enum DEFAULT 'first' NOT NULL;
      ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "is_paid" boolean DEFAULT false NOT NULL;

      -- Update register_closings
      ALTER TABLE "register_closings" ADD COLUMN IF NOT EXISTS "shift" shift_enum DEFAULT 'midday' NOT NULL;
      ALTER TABLE "register_closings" ADD COLUMN IF NOT EXISTS "cash_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;
      ALTER TABLE "register_closings" ADD COLUMN IF NOT EXISTS "card_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;

      -- Update categories
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "created_at" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_drink" boolean DEFAULT false NOT NULL;
      ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "course" course_enum DEFAULT 'first' NOT NULL;
      ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'categories') THEN
          CREATE POLICY tenant_isolation_policy ON "categories" FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
        END IF;
      END $$;

      -- Update menu_items
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
      ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "is_drink" boolean DEFAULT false NOT NULL;
      ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "course" course_enum DEFAULT 'first' NOT NULL;
      ALTER TABLE "menu_items" ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'menu_items') THEN
          CREATE POLICY tenant_isolation_policy ON "menu_items" FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
        END IF;
      END $$;

      -- Create register_openings
      CREATE TABLE IF NOT EXISTS "register_openings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "opening_amount" numeric(10, 2) NOT NULL,
        "created_at" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE "register_openings" ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'register_openings') THEN
          CREATE POLICY tenant_isolation_policy ON "register_openings" FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
        END IF;
      END $$;

      -- Create tenant_fixed_costs
      CREATE TABLE IF NOT EXISTS "tenant_fixed_costs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "monthly_amount" numeric(10, 2) NOT NULL,
        "created_at" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE "tenant_fixed_costs" ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'tenant_fixed_costs') THEN
          CREATE POLICY tenant_isolation_policy ON "tenant_fixed_costs" FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
        END IF;
      END $$;

      -- Create suppliers
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "contact_name" varchar(255),
        "phone" varchar(50),
        "email" varchar(255),
        "notes" text,
        "created_at" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'suppliers') THEN
          CREATE POLICY tenant_isolation_policy ON "suppliers" FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
        END IF;
      END $$;

      -- Create inventory_items
      CREATE TABLE IF NOT EXISTS "inventory_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "supplier_id" uuid REFERENCES "suppliers"("id") ON DELETE SET NULL,
        "name" varchar(255) NOT NULL,
        "quantity" numeric(10, 2) DEFAULT '0.00' NOT NULL,
        "min_stock" numeric(10, 2) DEFAULT '0.00' NOT NULL,
        "unit_type" unit_type_enum DEFAULT 'unit' NOT NULL,
        "cost_price" numeric(10, 2) DEFAULT '0.00',
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'inventory_items') THEN
          CREATE POLICY tenant_isolation_policy ON "inventory_items" FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
        END IF;
      END $$;

      -- Create order_payments
      CREATE TABLE IF NOT EXISTS "order_payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "amount" numeric(10, 2) NOT NULL,
        "payment_method" payment_method_enum DEFAULT 'cash' NOT NULL,
        "notes" varchar(255),
        "created_at" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE "order_payments" ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'order_payments') THEN
          CREATE POLICY tenant_isolation_policy ON "order_payments" FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
        END IF;
      END $$;
    `).catch(err => console.error('Auto table ensure warning:', err.message));
  }
  return db;
}

export async function runInTenantContext<T>(
  tenantId: string,
  queryFn: (tx: any) => Promise<T>,
  connectionString?: string
): Promise<T> {
  const database = getDb(connectionString);
  return await database.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    );
    return await queryFn(tx);
  });
}

export async function runWithBypassRLS<T>(
  queryFn: (tx: any) => Promise<T>,
  connectionString?: string
): Promise<T> {
  const database = getDb(connectionString);
  return await database.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.bypass_rls', 'true', true)`
    );
    return await queryFn(tx);
  });
}
