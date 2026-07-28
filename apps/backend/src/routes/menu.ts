import { FastifyInstance } from 'fastify';
import { runInTenantContext, categories, menuItems } from '@reustafy/database';
import { eq, desc } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';

export async function menuRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateJWT);

  // 1. Get full menu (categories & items) for tenant
  fastify.get('/menu', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    try {
      const data = await runInTenantContext(tenantId, async (tx: any) => {
        const catList = await tx.select().from(categories).orderBy(categories.name);
        const itemList = await tx.select().from(menuItems).orderBy(desc(menuItems.createdAt));

        return {
          categories: catList,
          items: itemList
        };
      });

      return data;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve menu' });
    }
  });

  // 2. Create a Category
  fastify.post('/menu/categories', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { name } = req.body as { name: string };

    if (!name) {
      return reply.code(400).send({ error: 'Category name is required' });
    }

    try {
      const inserted = await runInTenantContext(tenantId, async (tx: any) => {
        const [cat] = await tx
          .insert(categories)
          .values({
            tenantId,
            name
          })
          .returning();
        return cat;
      });

      return reply.code(201).send(inserted);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to create category' });
    }
  });

  // 3. Create a Menu Item
  fastify.post('/menu/items', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { categoryId, itemName, description, price, allergens } = req.body as {
      categoryId?: string;
      itemName: string;
      description?: string;
      price: number;
      allergens?: string;
    };

    if (!itemName || price === undefined || price < 0) {
      return reply.code(400).send({ error: 'itemName and a non-negative price are required' });
    }

    try {
      const inserted = await runInTenantContext(tenantId, async (tx: any) => {
        const [item] = await tx
          .insert(menuItems)
          .values({
            tenantId,
            categoryId: categoryId || null,
            itemName,
            description: description || null,
            price: price.toFixed(2),
            allergens: allergens || null,
            available: true
          })
          .returning();
        return item;
      });

      return reply.code(201).send(inserted);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to create menu item' });
    }
  });

  // 4. Toggle item availability
  fastify.patch('/menu/items/:id/availability', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { id } = req.params as { id: string };
    const { available } = req.body as { available: boolean };

    try {
      const updated = await runInTenantContext(tenantId, async (tx: any) => {
        const [item] = await tx
          .update(menuItems)
          .set({ available })
          .where(eq(menuItems.id, id))
          .returning();
        return item;
      });

      return updated;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to update item availability' });
    }
  });

  // 5. Delete a Menu Item
  fastify.delete('/menu/items/:id', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const { id } = req.params as { id: string };

    try {
      const deleted = await runInTenantContext(tenantId, async (tx: any) => {
        const [item] = await tx
          .delete(menuItems)
          .where(eq(menuItems.id, id))
          .returning();
        return item;
      });

      return deleted;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to delete menu item' });
    }
  });
}
