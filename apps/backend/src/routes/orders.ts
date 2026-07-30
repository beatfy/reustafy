import { FastifyInstance } from 'fastify';
import { runInTenantContext, orders, orderItems, orderPayments, tables, activityLogs } from '@reustafy/database';
import { eq, or, and, inArray } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';
import { notifyTenant } from '../events/event-bus';

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

      notifyTenant(tenantId, 'ORDER_CREATED', newOrder);

      return reply.code(201).send(newOrder);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to create order' });
    }
  });

  // Get all orders (optional filter by tableId, includes items)
  fastify.get('/orders', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { tableId } = req.query as { tableId?: string };

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        let query = tx
          .select({
            id: orders.id,
            tableId: orders.tableId,
            status: orders.status,
            totalAmount: orders.totalAmount,
            createdAt: orders.createdAt,
            tableNumber: tables.tableNumber
          })
          .from(orders)
          .leftJoin(tables, eq(orders.tableId, tables.id));

        if (tableId) {
          query = query.where(eq(orders.tableId, tableId));
        }

        const orderList = await query;

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

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve orders' });
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

      notifyTenant(tenantId, 'ORDER_STATUS_UPDATED', result);

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

      notifyTenant(tenantId, 'ITEM_STATUS_UPDATED', result);

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to update item status' });
    }
  });

  // 5. Register Payment (Full or Partial / Split)
  fastify.post('/orders/:id/payments', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { id } = req.params as { id: string };
    const { amount, paymentMethod, itemIds, notes } = req.body as {
      amount: number;
      paymentMethod: 'cash' | 'card' | 'mixed';
      itemIds?: string[];
      notes?: string;
    };

    if (!amount || amount <= 0) {
      return reply.code(400).send({ error: 'Valid amount is required' });
    }

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        // Record payment
        const [payment] = await tx
          .insert(orderPayments)
          .values({
            tenantId,
            orderId: id,
            amount: amount.toFixed(2),
            paymentMethod: paymentMethod || 'cash',
            notes: notes || null
          })
          .returning();

        // Mark items as paid if specified
        if (itemIds && itemIds.length > 0) {
          await tx
            .update(orderItems)
            .set({ isPaid: true })
            .where(and(eq(orderItems.orderId, id), inArray(orderItems.id, itemIds)));
        }

        // Get total paid so far
        const allPayments = await tx.select().from(orderPayments).where(eq(orderPayments.orderId, id));
        const totalPaid = allPayments.reduce((acc: number, p: any) => acc + parseFloat(p.amount), 0);

        // Fetch order details
        const [order] = await tx.select().from(orders).where(eq(orders.id, id));
        const totalOrder = parseFloat(order.totalAmount);

        let isFullyPaid = false;
        if (totalPaid >= totalOrder - 0.009) {
          isFullyPaid = true;
          await tx
            .update(orders)
            .set({ status: 'paid', updatedAt: new Date() })
            .where(eq(orders.id, id));

          if (order.tableId) {
            await tx.update(tables).set({ status: 'free' }).where(eq(tables.id, order.tableId));
          }
        }

        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Pago registrado para comanda (${amount.toFixed(2)}€ via ${paymentMethod}). ${isFullyPaid ? '¡Cuenta totalmente pagada!' : 'Pago parcial.'}`
        });

        return { payment, totalPaid, totalOrder, isFullyPaid };
      });

      notifyTenant(tenantId, 'ORDER_PAYMENT_REGISTERED', result);
      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to process payment' });
    }
  });

  // 6. Reclaim Item (Reclamar plato a cocina)
  fastify.post('/order-items/:id/reclaim', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { id } = req.params as { id: string };

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        const [item] = await tx.select().from(orderItems).where(eq(orderItems.id, id));
        if (!item) throw new Error('Plato no encontrado');

        const [order] = await tx.select().from(orders).where(eq(orders.id, item.orderId));
        let tableNumber = 'S/N';
        if (order && order.tableId) {
          const [table] = await tx.select().from(tables).where(eq(tables.id, order.tableId));
          if (table) tableNumber = table.tableNumber;
        }

        const actionText = `⚠️ RECLAMACIÓN: Plato '${item.itemName}' (Mesa ${tableNumber}) reclamado a cocina a las ${new Date().toLocaleTimeString('es-ES')}`;
        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: actionText
        });

        return { item, tableNumber, reclaimedAt: new Date().toISOString() };
      });

      notifyTenant(tenantId, 'ITEM_RECLAIMED', result);
      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to reclaim item' });
    }
  });

  // 7. Search Orders by Date Range
  fastify.get('/orders/search', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        const allOrders = await tx.select().from(orders);
        let filtered = allOrders;

        if (startDate) {
          const start = new Date(startDate);
          filtered = filtered.filter((o: any) => new Date(o.createdAt) >= start);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filtered = filtered.filter((o: any) => new Date(o.createdAt) <= end);
        }

        return filtered;
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to search orders' });
    }
  });

  // 8. Ranking of Dishes (Platos más vendidos)
  fastify.get('/orders/ranking', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        const allItems = await tx.select().from(orderItems);
        let filteredItems = allItems;

        if (startDate || endDate) {
          const start = startDate ? new Date(startDate) : new Date(0);
          const end = endDate ? new Date(endDate) : new Date();
          end.setHours(23, 59, 59, 999);

          filteredItems = filteredItems.filter((item: any) => {
            const date = new Date(item.createdAt);
            return date >= start && date <= end;
          });
        }

        const counts: Record<string, { itemName: string; totalQty: number; totalRevenue: number }> = {};
        for (const item of filteredItems) {
          if (!counts[item.itemName]) {
            counts[item.itemName] = { itemName: item.itemName, totalQty: 0, totalRevenue: 0 };
          }
          counts[item.itemName].totalQty += item.quantity;
          counts[item.itemName].totalRevenue += parseFloat(item.price) * item.quantity;
        }

        const ranking = Object.values(counts).sort((a, b) => b.totalQty - a.totalQty);
        return ranking;
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to compute dish ranking' });
    }
  });
}
