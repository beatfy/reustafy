import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export interface UserSession {
  userId: string;
  tenantId: string;
  role: 'admin' | 'manager' | 'waiter' | 'kitchen';
  subscriptionTier: 'basic' | 'medium' | 'premium';
}

declare module 'fastify' {
  interface FastifyRequest {
    userSession?: UserSession;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'reustafy_super_secret_jwt_key_2026';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'reustafy_super_secret_jwt_key_2026')) {
  console.error('CRITICAL SECURITY WARNING: JWT_SECRET must be explicitly set in production environment.');
}

export async function authenticateJWT(req: FastifyRequest, reply: FastifyReply) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if ((req.query as any)?.token) {
      token = (req.query as any).token;
    }

    if (!token) {
      return reply.code(401).send({ error: 'Unauthorized: Missing token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    req.userSession = decoded;
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
  }
}

export function generateToken(session: UserSession): string {
  return jwt.sign(session, JWT_SECRET, { expiresIn: '8h' });
}

