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

    // Auto-ensure new tables exist in PostgreSQL
    pool.query(`
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

      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "created_at" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'categories') THEN
          CREATE POLICY tenant_isolation_policy ON "categories" FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
        END IF;
      END $$;

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
      ALTER TABLE "menu_items" ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy' AND tablename = 'menu_items') THEN
          CREATE POLICY tenant_isolation_policy ON "menu_items" FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR current_setting('app.bypass_rls', true) = 'true');
        END IF;
      END $$;

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
    `).catch(err => console.error('Auto table ensure warning:', err.message));
  }
  return db;
}

/**
 * Execute a query or transaction under the isolated Row Level Security context
 * of a specific tenant.
 * 
 * Runs all instructions inside a PostgreSQL transaction where:
 * 1. SET LOCAL app.current_tenant_id = 'tenantId' is called first.
 * 2. The queryFn is executed.
 * 3. The transaction is committed (or rolled back on error).
 */
export async function runInTenantContext<T>(
  tenantId: string,
  queryFn: (tx: any) => Promise<T>,
  connectionString?: string
): Promise<T> {
  const database = getDb(connectionString);
  return await database.transaction(async (tx) => {
    // We use SET LOCAL so that app.current_tenant_id is scoped *only* to the current transaction.
    // Drizzle transaction will release the connection back to the pool after COMMIT/ROLLBACK,
    // and since it was set via SET LOCAL, the variable will be cleared automatically, preventing leaks.
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    );
    return await queryFn(tx);
  });
}

/**
 * Execute a query or transaction by bypassing Row Level Security.
 * This should only be used for system queries like finding users during auth
 * where the tenant context is not yet loaded.
 */
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

