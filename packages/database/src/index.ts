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

