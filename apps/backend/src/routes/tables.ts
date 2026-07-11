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

        // Mirror status change if joined
        if (updated.joinedWithTableId) {
          await tx
            .update(tables)
            .set({ status })
            .where(eq(tables.id, updated.joinedWithTableId));
        }

        // 2. Create an activity log
        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Mesa ${updated.tableNumber} cambiada a estado '${status}'${updated.joinedWithTableId ? ' (Sincronizada con mesa unida)' : ''}`
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

  // Join two tables
  fastify.post('/tables/join', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { tableIdA, tableIdB } = req.body as { tableIdA: string; tableIdB: string };

    if (!tableIdA || !tableIdB || tableIdA === tableIdB) {
      return reply.code(400).send({ error: 'Two different table IDs are required to join' });
    }

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        // 1. Update Table A to link to Table B
        const [updatedA] = await tx
          .update(tables)
          .set({ joinedWithTableId: tableIdB })
          .where(eq(tables.id, tableIdA))
          .returning();

        // 2. Update Table B to link to Table A
        const [updatedB] = await tx
          .update(tables)
          .set({ joinedWithTableId: tableIdA })
          .where(eq(tables.id, tableIdB))
          .returning();

        if (!updatedA || !updatedB) {
          throw new Error('One or both tables could not be found');
        }

        // Log the link
        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Mesas unidas: Mesa ${updatedA.tableNumber} y Mesa ${updatedB.tableNumber}`
        });

        return { success: true, tableA: updatedA, tableB: updatedB };
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to join tables' });
    }
  });

  // Unjoin a table (breaks connection on both ends)
  fastify.post('/tables/unjoin', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { tableId } = req.body as { tableId: string };

    if (!tableId) {
      return reply.code(400).send({ error: 'tableId is required' });
    }

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        // 1. Find the target table
        const [table] = await tx
          .select()
          .from(tables)
          .where(eq(tables.id, tableId));

        if (!table) {
          throw new Error('Table not found');
        }

        const joinedId = table.joinedWithTableId;

        // 2. Clear joinedWithTableId on target table
        await tx
          .update(tables)
          .set({ joinedWithTableId: null })
          .where(eq(tables.id, tableId));

        // 3. Clear joinedWithTableId on the partner table (if existed)
        if (joinedId) {
          await tx
            .update(tables)
            .set({ joinedWithTableId: null })
            .where(eq(tables.id, joinedId));
        }

        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Mesa ${table.tableNumber} desunida / separada`
        });

        return { success: true, unjoinedTableId: tableId, partnerTableId: joinedId };
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to unjoin tables' });
    }
  });

  // CRUD: Add a new table
  fastify.post('/tables', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { tableNumber, zone, capacity } = req.body as { tableNumber: string; zone: 'salon' | 'terrace' | 'bar'; capacity: number };

    if (!tableNumber || !zone || !capacity) {
      return reply.code(400).send({ error: 'tableNumber, zone and capacity are required' });
    }

    try {
      const newTable = await runInTenantContext(tenantId, async (tx: any) => {
        const [inserted] = await tx
          .insert(tables)
          .values({
            tenantId,
            tableNumber,
            zone,
            capacity: parseInt(capacity as any)
          })
          .returning();

        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Nueva mesa ${tableNumber} creada en zona ${zone} (pax: ${capacity})`
        });

        return inserted;
      });

      return reply.code(201).send(newTable);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to create table' });
    }
  });

  // CRUD: Delete a table
  fastify.delete('/tables/:id', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { id } = req.params as { id: string };

    try {
      const deletedTable = await runInTenantContext(tenantId, async (tx: any) => {
        const [deleted] = await tx
          .delete(tables)
          .where(eq(tables.id, id))
          .returning();

        if (!deleted) {
          throw new Error('Table not found or access denied');
        }

        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Mesa ${deleted.tableNumber} eliminada del restaurante`
        });

        return deleted;
      });

      return deletedTable;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to delete table' });
    }
  });
}
