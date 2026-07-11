import { FastifyInstance } from 'fastify';
import { runInTenantContext, customers, activityLogs } from '@reustafy/database';
import { eq, desc } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';
import { requireTier } from '../middleware/subscription';

export async function loyaltyRoutes(fastify: FastifyInstance) {
  
  fastify.addHook('preHandler', authenticateJWT);
  fastify.addHook('preHandler', requireTier('medium')); // Medium tier requirement

  // 1. Get all loyalty customers
  fastify.get('/loyalty/customers', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    try {
      const list = await runInTenantContext(tenantId, async (tx: any) => {
        return await tx
          .select()
          .from(customers)
          .orderBy(desc(customers.points));
      });
      return list;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve loyalty customers' });
    }
  });

  // 2. Add or update a customer profile
  fastify.post('/loyalty/customers', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { name, email, phone, points, allergies, preferences } = req.body as any;

    if (!name || !email) {
      return reply.code(400).send({ error: 'Name and Email are required' });
    }

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        // Insert or update on conflict (upsert)
        const [customer] = await tx
          .insert(customers)
          .values({
            tenantId,
            name,
            email,
            phone,
            points: points ? parseInt(points) : 0,
            allergies,
            preferences
          })
          .onConflictDoUpdate({
            target: [customers.tenantId, customers.email],
            set: {
              name,
              phone,
              points: points ? parseInt(points) : 0,
              allergies,
              preferences
            }
          })
          .returning();

        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Perfil de cliente fidelizado actualizado: ${name} (${email})`
        });

        return customer;
      });

      return reply.code(201).send(result);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to save customer profile' });
    }
  });

  // 3. Campaign trigger simulator
  fastify.post('/loyalty/triggers', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;

    try {
      const simulationLogs = await runInTenantContext(tenantId, async (tx: any) => {
        // Find customers
        const customerList = await tx.select().from(customers);
        
        if (customerList.length === 0) {
          return [{ msg: 'No se encontraron clientes para la campaña.' }];
        }

        const logs = [];
        for (const cust of customerList) {
          // Mock reactivation criteria: points > 50 or custom preference check
          const pointsThreshold = 50;
          if (cust.points >= pointsThreshold) {
            logs.push({
              msg: `Enviado e-mail de reactivación a ${cust.name} (${cust.email}) - Código de descuento: FIDELITY${cust.points}`
            });
            
            // Write to audit log
            await tx.insert(activityLogs).values({
              tenantId,
              userId,
              actionDescription: `Trigger de Marketing: E-mail de reactivación automático enviado a ${cust.name}`
            });
          }
        }
        
        return logs;
      });

      return {
        campaign: 'Reactivación Clientes Inactivos (30 días)',
        timestamp: new Date(),
        status: 'completed',
        logs: simulationLogs
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to run campaign simulation' });
    }
  });
}
