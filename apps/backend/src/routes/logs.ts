import { FastifyInstance } from 'fastify';
import { runInTenantContext, activityLogs, users } from '@reustafy/database';
import { desc, eq } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';

export async function logRoutes(fastify: FastifyInstance) {
  
  fastify.addHook('preHandler', authenticateJWT);

  // Get activity logs for the current tenant
  fastify.get('/logs', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    try {
      const logs = await runInTenantContext(tenantId, async (tx) => {
        return await tx
          .select({
            id: activityLogs.id,
            actionDescription: activityLogs.actionDescription,
            timestamp: activityLogs.timestamp,
            userName: users.name,
            userRole: users.role
          })
          .from(activityLogs)
          .leftJoin(users, eq(activityLogs.userId, users.id))
          .orderBy(desc(activityLogs.timestamp))
          .limit(50); // limit to recent 50 logs
      });

      return logs;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve activity logs' });
    }
  });
}
