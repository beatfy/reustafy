import { FastifyInstance } from 'fastify';
import { runInTenantContext, reservations, activityLogs } from '@reustafy/database';
import { eq, desc } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';

export async function reservationRoutes(fastify: FastifyInstance) {
  
  fastify.addHook('preHandler', authenticateJWT);

  // Get all reservations for the tenant
  fastify.get('/reservations', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    try {
      const result = await runInTenantContext(tenantId, async (tx) => {
        return await tx
          .select()
          .from(reservations)
          .orderBy(desc(reservations.reservationTime));
      });
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve reservations' });
    }
  });

  // Create a new reservation
  fastify.post('/reservations', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { customerName, customerEmail, customerPhone, partySize, reservationTime, tableId } = req.body as any;

    if (!customerName || !partySize || !reservationTime) {
      return reply.code(400).send({ error: 'customerName, partySize and reservationTime are required' });
    }

    try {
      const newReservation = await runInTenantContext(tenantId, async (tx) => {
        const [res] = await tx
          .insert(reservations)
          .values({
            tenantId,
            customerName,
            customerEmail,
            customerPhone,
            partySize: parseInt(partySize),
            reservationTime: new Date(reservationTime),
            tableId: tableId || null,
            status: 'pending'
          })
          .returning();

        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Nueva reserva creada para ${customerName} (Mesa: ${tableId ? 'Asignada' : 'Sin asignar'}, Pax: ${partySize})`
        });

        return res;
      });

      return reply.code(201).send(newReservation);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create reservation' });
    }
  });

  // Assign a table to a reservation or change reservation status (e.g. pending -> seated)
  fastify.patch('/reservations/:id', async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { id } = req.params as { id: string };
    const { status, tableId } = req.body as { status?: 'pending' | 'confirmed' | 'cancelled' | 'seated', tableId?: string | null };

    try {
      const updated = await runInTenantContext(tenantId, async (tx) => {
        const updateData: any = {};
        if (status !== undefined) updateData.status = status;
        if (tableId !== undefined) updateData.tableId = tableId;

        const [res] = await tx
          .update(reservations)
          .set(updateData)
          .where(eq(reservations.id, id))
          .returning();

        if (!res) {
          throw new Error('Reservation not found');
        }

        await tx.insert(activityLogs).values({
          tenantId,
          userId,
          actionDescription: `Reserva de ${res.customerName} actualizada (Estado: ${res.status}, Mesa: ${res.tableId ? 'Asignada' : 'Sin asignar'})`
        });

        return res;
      });

      return updated;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to update reservation' });
    }
  });
}
