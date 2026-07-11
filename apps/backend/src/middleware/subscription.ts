import { FastifyRequest, FastifyReply } from 'fastify';

const TIER_LEVELS = {
  basic: 1,
  medium: 2,
  premium: 3
};

type SubscriptionTier = keyof typeof TIER_LEVELS;

export function requireTier(requiredTier: SubscriptionTier) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const session = req.userSession;
    if (!session) {
      return reply.code(401).send({ error: 'Unauthorized: Session context missing' });
    }

    const currentTierLevel = TIER_LEVELS[session.subscriptionTier] || 1;
    const requiredTierLevel = TIER_LEVELS[requiredTier];

    if (currentTierLevel < requiredTierLevel) {
      return reply.code(403).send({
        error: `Forbidden: Access requires '${requiredTier}' subscription tier. Your tenant tier is '${session.subscriptionTier}'.`
      });
    }
  };
}
