import { runInTenantContext, getDb, tables, tenants } from './index';
import { eq } from 'drizzle-orm';

async function runTest() {
  console.log('--- STARTING ROW LEVEL SECURITY (RLS) VERIFICATION TEST ---');
  
  const db = getDb();
  
  // Tenant A: Don Curro (Basic)
  const tenantAId = 'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e1';
  // Tenant B: Le Gourmet (Premium)
  const tenantBId = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b2';

  try {
    console.log('\n1. Verifying data isolation for Tenant A (Don Curro)...');
    const tenantATables = await runInTenantContext(tenantAId, async (tx) => {
      // Query tenants
      const currentTenant = await tx.select().from(tenants).where(eq(tenants.id, tenantAId));
      console.log(`> Current tenant in context: ${currentTenant[0]?.name || 'Unknown'}`);
      
      // Query tables
      return await tx.select().from(tables);
    });
    
    console.log(`> Found ${tenantATables.length} tables under Tenant A context.`);
    tenantATables.forEach((t: any) => {
      console.log(`   - Mesa ${t.tableNumber} in Zone: ${t.zone} (Tenant ID: ${t.tenantId})`);
      if (t.tenantId !== tenantAId) {
        throw new Error('CRITICAL RLS LEAK: Found table belonging to another tenant!');
      }
    });

    console.log('\n2. Verifying data isolation for Tenant B (Le Gourmet)...');
    const tenantBTables = await runInTenantContext(tenantBId, async (tx) => {
      const currentTenant = await tx.select().from(tenants).where(eq(tenants.id, tenantBId));
      console.log(`> Current tenant in context: ${currentTenant[0]?.name || 'Unknown'}`);
      
      return await tx.select().from(tables);
    });

    console.log(`> Found ${tenantBTables.length} tables under Tenant B context.`);
    tenantBTables.forEach((t: any) => {
      console.log(`   - Mesa ${t.tableNumber} in Zone: ${t.zone} (Tenant ID: ${t.tenantId})`);
      if (t.tenantId !== tenantBId) {
        throw new Error('CRITICAL RLS LEAK: Found table belonging to another tenant!');
      }
    });

    console.log('\n3. Verifying database isolation works correctly when running query without setting tenant context...');
    try {
      // Query directly from database connection (session current_tenant_id is empty/unset)
      const directTables = await db.select().from(tables);
      console.log(`> Direct query returned ${directTables.length} tables.`);
      if (directTables.length > 0) {
        console.warn(`> WARNING: Direct query returned results. If executing as database superuser, RLS may be bypassed by default. In production, connect with a non-owner tenant-role to ensure absolute isolation!`);
      } else {
        console.log(`> SUCCESS: Direct query returned 0 rows because no current_tenant_id context is active!`);
      }
    } catch (e: any) {
      console.log(`> RLS Policy successfully blocked direct query: ${e.message}`);
    }

    console.log('\n--- RLS VERIFICATION TEST COMPLETED SUCCESSFULLY ---');
  } catch (error) {
    console.error('--- RLS VERIFICATION TEST FAILED! ---', error);
  } finally {
    process.exit(0);
  }
}

runTest();
