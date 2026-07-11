import { FastifyInstance } from 'fastify';
import { runInTenantContext, users, activityLogs } from '@reustafy/database';
import { eq, and, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authenticateJWT } from '../middleware/auth';

export async function configRoutes(fastify: FastifyInstance) {
  
  fastify.addHook('preHandler', authenticateJWT);

  // 1. Get all employees
  fastify.get('/config/employees', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        // Retrieve all users for the current tenant
        const employeesList = await tx
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            active: users.active,
            createdAt: users.createdAt
          })
          .from(users)
          .where(eq(users.tenantId, tenantId));
        return employeesList;
      });
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve employees' });
    }
  });

  // 2. Add a new employee
  fastify.post('/config/employees', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const adminUserId = req.userSession!.userId;
    const { name, email, password, role } = req.body as any;

    if (!name || !email || !password || !role) {
      return reply.code(400).send({ error: 'name, email, password and role are required' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      const newEmployee = await runInTenantContext(tenantId, async (tx: any) => {
        // Check if email already exists
        const exists = await tx
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (exists.length > 0) {
          throw new Error('Email is already taken');
        }

        const [inserted] = await tx
          .insert(users)
          .values({
            tenantId,
            name,
            email,
            passwordHash,
            role,
            active: true
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            active: users.active
          });

        await tx.insert(activityLogs).values({
          tenantId,
          userId: adminUserId,
          actionDescription: `Nuevo empleado creado: ${name} (${role})`
        });

        return inserted;
      });

      return reply.code(201).send(newEmployee);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to create employee' });
    }
  });

  // 3. Remove/Delete an employee
  fastify.delete('/config/employees/:id', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const adminUserId = req.userSession!.userId;
    const { id } = req.params as { id: string };

    if (id === adminUserId) {
      return reply.code(400).send({ error: 'Cannot delete your own account' });
    }

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
        const [deleted] = await tx
          .delete(users)
          .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
          .returning();

        if (!deleted) {
          throw new Error('Employee not found or access denied');
        }

        await tx.insert(activityLogs).values({
          tenantId,
          userId: adminUserId,
          actionDescription: `Empleado eliminado: ${deleted.name} (${deleted.role})`
        });

        return { success: true, deletedEmployee: deleted.name };
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to delete employee' });
    }
  });
}
