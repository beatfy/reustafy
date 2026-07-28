import { FastifyInstance } from 'fastify';
import { authenticateJWT } from '../middleware/auth';
import { eventBus, RealtimeEvent } from '../events/event-bus';

export async function eventsRoutes(fastify: FastifyInstance) {
  fastify.get('/events', { preHandler: authenticateJWT }, (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    // Send initial connection event
    reply.raw.write(`data: ${JSON.stringify({ type: 'CONNECTED', tenantId, timestamp: new Date().toISOString() })}\n\n`);

    const listener = (event: RealtimeEvent) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const channel = `tenant:${tenantId}`;
    eventBus.on(channel, listener);

    // Keep connection alive with heartbeat every 25 seconds
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 25000);

    req.raw.on('close', () => {
      eventBus.removeListener(channel, listener);
      clearInterval(heartbeat);
    });
  });
}
