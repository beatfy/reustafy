import { FastifyInstance } from 'fastify';
import { runInTenantContext, tables, activityLogs, orders } from '@reustafy/database';
import { eq, and, ne } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';

export async function tableRoutes(fastify: FastifyInstance) {
  
  // Apply authentication to all table routes
  fastify.addHook('preHandler', authenticateJWT);

  // Get all tables for the tenant (filtered by RLS)
  fastify.get('/tables', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
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
      const updatedTable = await runInTenantContext(tenantId, async (tx: any) => {
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

  // Settle bill / checkout a table
  fastify.post('/tables/:id/checkout', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { id } = req.params as { id: string };
    const { orderType } = req.body as { orderType?: 'dine_in' | 'takeaway' };

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        // 1. Get the table details to know the table number
        const [table] = await tx
          .select()
          .from(tables)
          .where(eq(tables.id, id));

        if (!table) {
          throw new Error('Table not found');
        }

        // 2. Settle all orders for this table where status != 'paid'
        const updatedOrders = await tx
          .update(orders)
          .set({ status: 'paid', updatedAt: new Date() })
          .where(
            and(
              eq(orders.tableId, id),
              ne(orders.status, 'paid')
            )
          )
          .returning();

        // 3. Reset the table status to 'free'
        await tx
          .update(tables)
          .set({ status: 'free' })
          .where(eq(tables.id, id));

        const totalSettled = updatedOrders.reduce((acc: number, o: any) => acc + parseFloat(o.totalAmount), 0);

        // 4. Log the action
        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Mesa ${table.tableNumber} cobrada y liberada. Total cobrado: ${totalSettled.toFixed(2)}€ (${orderType === 'takeaway' ? 'Para llevar' : 'Servicio en local'})`
        });

        return {
          success: true,
          tableId: id,
          tableNumber: table.tableNumber,
          totalSettled: totalSettled.toFixed(2),
          ordersCount: updatedOrders.length
        };
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to checkout table' });
    }
  });
}
