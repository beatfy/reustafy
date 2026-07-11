import { FastifyInstance } from 'fastify';
import { runInTenantContext, orders, orderItems, tables, activityLogs } from '@reustafy/database';
import { eq, or, and, inArray } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';

interface CreateOrderBody {
  tableId: string;
  items: Array<{
    itemName: string;
    quantity: number;
    price: number;
  }>;
}

export async function orderRoutes(fastify: FastifyInstance) {
  
  fastify.addHook('preHandler', authenticateJWT);

  // 1. Create a New Order with Items (Waiter)
  fastify.post('/orders', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const waiterId = req.userSession!.userId;
    const { tableId, items } = req.body as CreateOrderBody;

    if (!tableId || !items || items.length === 0) {
      return reply.code(400).send({ error: 'tableId and non-empty items array are required' });
    }

    try {
      const newOrder = await runInTenantContext(tenantId, async (tx: any) => {
        // Calculate total amount
        const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // Check if table exists
        const tableExist = await tx
          .select()
          .from(tables)
          .where(eq(tables.id, tableId))
          .limit(1);

        if (tableExist.length === 0) {
          throw new Error('Table not found');
        }

        const tableNum = tableExist[0].tableNumber;

        // Create Order
        const [insertedOrder] = await tx
          .insert(orders)
          .values({
            tenantId,
            tableId,
            waiterId,
            status: 'pending',
            totalAmount: total.toFixed(2)
          })
          .returning();

        // Insert Order Items
        const itemsToInsert = items.map((item) => ({
          tenantId,
          orderId: insertedOrder.id,
          itemName: item.itemName,
          quantity: item.quantity,
          price: item.price.toFixed(2),
          status: 'pending' as const
        }));

        await tx.insert(orderItems).values(itemsToInsert);

        // Update Table Status to 'ordered'
        await tx
          .update(tables)
          .set({ status: 'ordered' })
          .where(eq(tables.id, tableId));

        // Create Log
        const itemsList = items.map((i) => `${i.quantity}x ${i.itemName}`).join(', ');
        await tx.insert(activityLogs).values({
          tenantId,
          userId: waiterId,
          actionDescription: `Nueva comanda creada en Mesa ${tableNum}: [${itemsList}]. Total: ${total.toFixed(2)}€`
        });

        return insertedOrder;
      });

      return reply.code(201).send(newOrder);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to create order' });
    }
  });

  // 2. Get active orders for Kitchen Display System (KDS)
  fastify.get('/orders/kds', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    try {
      const activeOrders = await runInTenantContext(tenantId, async (tx: any) => {
        // Retrieve orders that are pending, cooking, or served (not paid yet)
        const orderList = await tx
          .select({
            id: orders.id,
            status: orders.status,
            totalAmount: orders.totalAmount,
            createdAt: orders.createdAt,
            tableNumber: tables.tableNumber,
            zone: tables.zone
          })
          .from(orders)
          .leftJoin(tables, eq(orders.tableId, tables.id))
          .where(
            and(
              inArray(orders.status, ['pending', 'cooking', 'served'])
            )
          );

        if (orderList.length === 0) return [];

        // Load items for each order
        const fullOrders = [];
        for (const order of orderList) {
          const items = await tx
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));
          
          fullOrders.push({
            ...order,
            items
          });
        }
        return fullOrders;
      });

      return activeOrders;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve KDS orders' });
    }
  });

  // 3. Update Order Status (e.g. pending -> cooking -> served -> paid)
  fastify.patch('/orders/:id/status', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: 'pending' | 'cooking' | 'served' | 'paid' };

    if (!status) {
      return reply.code(400).send({ error: 'Status is required' });
    }

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        const [updatedOrder] = await tx
          .update(orders)
          .set({ status, updatedAt: new Date() })
          .where(eq(orders.id, id))
          .returning();

        if (!updatedOrder) {
          throw new Error('Order not found or access denied');
        }

        // Get table details to update the table status or log
        let tableNum = 'Desconocida';
        if (updatedOrder.tableId) {
          const tResult = await tx.select().from(tables).where(eq(tables.id, updatedOrder.tableId)).limit(1);
          if (tResult.length > 0) {
            tableNum = tResult[0].tableNumber;

            // If paid, change table status back to 'free'
            if (status === 'paid') {
              await tx.update(tables).set({ status: 'free' }).where(eq(tables.id, updatedOrder.tableId));
            } else if (status === 'cooking') {
              await tx.update(tables).set({ status: 'eating' }).where(eq(tables.id, updatedOrder.tableId));
            }
          }
        }

        // Log the change
        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Comanda de Mesa ${tableNum} cambiada a estado '${status}'`
        });

        return updatedOrder;
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to update order status' });
    }
  });

  // 4. Update individual Order Item Status (KDS interactive)
  fastify.patch('/order-items/:id/status', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: 'pending' | 'cooking' | 'served' };

    if (!status) {
      return reply.code(400).send({ error: 'Status is required' });
    }

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        const [updatedItem] = await tx
          .update(orderItems)
          .set({ status })
          .where(eq(orderItems.id, id))
          .returning();

        if (!updatedItem) {
          throw new Error('Order item not found or access denied');
        }

        // Log item status change
        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Plato '${updatedItem.itemName}' cambiado a estado '${status}'`
        });

        return updatedItem;
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to update item status' });
    }
  });
}
