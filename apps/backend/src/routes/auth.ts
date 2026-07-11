import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { runWithBypassRLS, users, tenants } from '@reustafy/database';
import { generateToken } from '../middleware/auth';

export async function authRoutes(fastify: FastifyInstance) {
  
  // Login Route
  fastify.post('/login', async (req, reply) => {
    const { email, password } = req.body as any;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    try {
      // Find the user by email (bypass RLS since we do not know the tenant ID yet)
      const userResult = await runWithBypassRLS(async (tx: any) => {
        return await tx
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
      });

      const user = userResult[0];

      if (!user) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      // Check Password
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      if (!user.active) {
        return reply.code(403).send({ error: 'User account is inactive' });
      }

      // Find Tenant details to check Subscription Tier
      const tenantResult = await runWithBypassRLS(async (tx: any) => {
        return await tx
          .select()
          .from(tenants)
          .where(eq(tenants.id, user.tenantId))
          .limit(1);
      });

      const tenant = tenantResult[0];

      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      // Generate JWT Token
      const token = generateToken({
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        subscriptionTier: tenant.subscriptionTier
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: tenant.name,
          subscriptionTier: tenant.subscriptionTier
        }
      };

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Verify route
  fastify.get('/me', async (req, reply) => {
    // Middleware will run before handler (configured in server.ts)
    return { user: req.userSession };
  });
}
