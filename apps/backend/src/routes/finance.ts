import { FastifyInstance } from 'fastify';
import { authenticateJWT } from '../middleware/auth';
import { requireTier } from '../middleware/subscription';

export async function financeRoutes(fastify: FastifyInstance) {
  
  fastify.addHook('preHandler', authenticateJWT);
  
  // This module requires premium tier
  fastify.addHook('preHandler', requireTier('premium'));

  // Get financial report (Premium feature)
  fastify.get('/pnl', async (req, reply) => {
    return {
      message: 'Arqueo de caja y P&L cargados correctamente.',
      tenantId: req.userSession!.tenantId,
      subscriptionTier: req.userSession!.subscriptionTier,
      data: {
        totalRevenue: 24500.00,
        foodCost: 6125.00,
        laborCost: 9800.00,
        otherExpenses: 3200.00,
        netProfit: 5375.00,
        forecastNextMonthRevenue: 27800.00,
        confidenceInterval: '94.2%'
      }
    };
  });

  // Get recipe costing / escandallos (Premium feature)
  fastify.get('/costing', async (req, reply) => {
    return {
      message: 'Coste de recetas (Escandallos) cargado.',
      items: [
        { recipeName: 'Solomillo al Whisky', supplierCost: 4.20, menuPrice: 14.50, marginPercent: 71.0 },
        { recipeName: 'Patatas Bravas', supplierCost: 0.80, menuPrice: 6.50, marginPercent: 87.7 },
        { recipeName: 'Hamburguesa Gourmet', supplierCost: 3.50, menuPrice: 14.00, marginPercent: 75.0 }
      ]
    };
  });
}
