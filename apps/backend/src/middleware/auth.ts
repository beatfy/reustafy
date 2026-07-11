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

export async function authenticateJWT(req: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized: Missing or invalid token format' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    req.userSession = decoded;
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
  }
}

export function generateToken(session: UserSession): string {
  return jwt.sign(session, JWT_SECRET, { expiresIn: '8h' });
}
