import { FastifyInstance } from 'fastify';
import { runInTenantContext, suppliers, inventoryItems, activityLogs } from '@reustafy/database';
import { eq } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';

export async function inventoryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateJWT);

  // --- SUPPLIERS ---
  // Get all suppliers
  fastify.get('/suppliers', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    try {
      return await runInTenantContext(tenantId, async (tx: any) => {
        return await tx.select().from(suppliers);
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve suppliers' });
    }
  });

  // Create supplier
  fastify.post('/suppliers', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { name, contactName, phone, email, notes } = req.body as any;

    if (!name) {
      return reply.code(400).send({ error: 'Supplier name is required' });
    }

    try {
      const newSupplier = await runInTenantContext(tenantId, async (tx: any) => {
        const [created] = await tx
          .insert(suppliers)
          .values({
            tenantId,
            name,
            contactName: contactName || null,
            phone: phone || null,
            email: email || null,
            notes: notes || null
          })
          .returning();
        return created;
      });
      return reply.code(201).send(newSupplier);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to create supplier' });
    }
  });

  // Delete supplier
  fastify.delete('/suppliers/:id', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { id } = req.params as { id: string };

    try {
      const deleted = await runInTenantContext(tenantId, async (tx: any) => {
        const [res] = await tx.delete(suppliers).where(eq(suppliers.id, id)).returning();
        return res;
      });
      return deleted || { success: true };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete supplier' });
    }
  });

  // --- INVENTORY ITEMS ---
  // Get all inventory items
  fastify.get('/inventory', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    try {
      return await runInTenantContext(tenantId, async (tx: any) => {
        return await tx.select().from(inventoryItems);
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve inventory items' });
    }
  });

  // Create inventory item
  fastify.post('/inventory', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { name, supplierId, quantity, minStock, unitType, costPrice } = req.body as any;

    if (!name) {
      return reply.code(400).send({ error: 'Item name is required' });
    }

    try {
      const newItem = await runInTenantContext(tenantId, async (tx: any) => {
        const [created] = await tx
          .insert(inventoryItems)
          .values({
            tenantId,
            name,
            supplierId: supplierId || null,
            quantity: quantity ? String(quantity) : '0.00',
            minStock: minStock ? String(minStock) : '0.00',
            unitType: unitType || 'unit',
            costPrice: costPrice ? String(costPrice) : '0.00'
          })
          .returning();

        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Nuevo producto en almacén: ${name} (${quantity} ${unitType})`
        });

        return created;
      });

      return reply.code(201).send(newItem);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to create inventory item' });
    }
  });

  // Update inventory item stock/details
  fastify.patch('/inventory/:id', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { id } = req.params as { id: string };
    const { name, supplierId, quantity, minStock, unitType, costPrice } = req.body as any;

    try {
      const updated = await runInTenantContext(tenantId, async (tx: any) => {
        const updateData: any = {};
        if (name) updateData.name = name;
        if (supplierId !== undefined) updateData.supplierId = supplierId || null;
        if (quantity !== undefined) updateData.quantity = String(quantity);
        if (minStock !== undefined) updateData.minStock = String(minStock);
        if (unitType) updateData.unitType = unitType;
        if (costPrice !== undefined) updateData.costPrice = String(costPrice);
        updateData.updatedAt = new Date();

        const [res] = await tx
          .update(inventoryItems)
          .set(updateData)
          .where(eq(inventoryItems.id, id))
          .returning();
        return res;
      });

      return updated;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to update inventory item' });
    }
  });

  // Delete inventory item
  fastify.delete('/inventory/:id', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { id } = req.params as { id: string };

    try {
      const deleted = await runInTenantContext(tenantId, async (tx: any) => {
        const [res] = await tx.delete(inventoryItems).where(eq(inventoryItems.id, id)).returning();
        return res;
      });
      return deleted || { success: true };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete inventory item' });
    }
  });
}
