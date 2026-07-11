import { FastifyInstance } from 'fastify';
import { runInTenantContext, tables, activityLogs } from '@reustafy/database';
import { eq } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';

export async function tableRoutes(fastify: FastifyInstance) {
  
  // Apply authentication to all table routes
  fastify.addHook('preHandler', authenticateJWT);

  // Get all tables for the tenant (filtered by RLS)
  fastify.get('/tables', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    try {
      const result = await runInTenantContext(tenantId, async (tx) => {
        return await tx.select().from(tables);
      });
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve tables' });
    }
  });

  // Update a table's status and log the action
  fastify.patch('/tables/:id/status', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const userName = req.userSession!.role; // or just log using userId
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: 'free' | 'ordered' | 'eating' | 'bill' | 'reserved' };

    if (!status) {
      return reply.code(400).send({ error: 'Status is required' });
    }

    try {
      const updatedTable = await runInTenantContext(tenantId, async (tx) => {
        // 1. Update the table status
        const [updated] = await tx
          .update(tables)
          .set({ status })
          .where(eq(tables.id, id))
          .returning();
          
        if (!updated) {
          throw new Error('Table not found or access denied');
        }

        // 2. Create an activity log
        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Mesa ${updated.tableNumber} cambiada a estado '${status}'`
        });

        return updated;
      });

      return updatedTable;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to update table status' });
    }
  });
}
