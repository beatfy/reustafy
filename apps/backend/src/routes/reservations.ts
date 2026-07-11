import { FastifyInstance } from 'fastify';
import { runInTenantContext, reservations, activityLogs } from '@reustafy/database';
import { eq, desc } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth';

export async function reservationRoutes(fastify: FastifyInstance) {
  
  // ==========================================
  // PROTECTED ENDPOINTS (Floor Manager Panel)
  // ==========================================

  // Get all reservations for the tenant
  fastify.get('/reservations', { preHandler: authenticateJWT }, async (req, reply) => {
    const tenantId = req.userSession!.tenantId;

    try {
      const result = await runInTenantContext(tenantId, async (tx: any) => {
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

  // Create a new reservation internally
  fastify.post('/reservations', { preHandler: authenticateJWT }, async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { customerName, customerEmail, customerPhone, partySize, reservationTime, tableId } = req.body as any;

    if (!customerName || !partySize || !reservationTime) {
      return reply.code(400).send({ error: 'customerName, partySize and reservationTime are required' });
    }

    try {
      const newReservation = await runInTenantContext(tenantId, async (tx: any) => {
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
          actionDescription: `Nueva reserva creada internamente para ${customerName} (Pax: ${partySize})`
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
  fastify.patch('/reservations/:id', { preHandler: authenticateJWT }, async (req, reply) => {
    const tenantId = req.userSession!.tenantId;
    const userId = req.userSession!.userId;
    const { id } = req.params as { id: string };
    const { status, tableId } = req.body as { status?: 'pending' | 'confirmed' | 'cancelled' | 'seated', tableId?: string | null };

    try {
      const updated = await runInTenantContext(tenantId, async (tx: any) => {
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

  // ==========================================
  // PUBLIC ENDPOINTS (External Widget)
  // ==========================================

  // Public Booking Widget endpoint (Bypasses standard JWT token checks, uses tenantId from request body)
  fastify.post('/public/reservations', async (req, reply) => {
    const { tenantId, customerName, customerEmail, customerPhone, partySize, reservationTime } = req.body as any;

    if (!tenantId || !customerName || !partySize || !reservationTime) {
      return reply.code(400).send({ error: 'tenantId, customerName, partySize, and reservationTime are required' });
    }

    try {
      // Execute within target tenant's RLS database context
      const newReservation = await runInTenantContext(tenantId, async (tx: any) => {
        const [res] = await tx
          .insert(reservations)
          .values({
            tenantId,
            customerName,
            customerEmail,
            customerPhone,
            partySize: parseInt(partySize),
            reservationTime: new Date(reservationTime),
            tableId: null, // Public bookings are unassigned by default
            status: 'pending'
          })
          .returning();

        // Write audit log for the restaurant
        await tx.insert(activityLogs).values({
          tenantId,
          userId: null, // System / Public entry
          actionDescription: `Reserva online recibida de ${customerName} (Widget público, Pax: ${partySize})`
        });

        return res;
      });

      return reply.code(201).send(newReservation);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to submit online reservation' });
    }
  });

  // Serve the public widget HTML
  fastify.get('/public-widget', async (req, reply) => {
    const { tenantId } = req.query as { tenantId?: string };

    if (!tenantId) {
      reply.type('text/html');
      return `<html><body style="font-family:sans-serif;background:#0f172a;color:#94a3b8;display:flex;justify-content:center;align-items:center;height:100vh;"><h3>Error: tenantId is required</h3></body></html>`;
    }

    reply.type('text/html');
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Online</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: transparent;
      margin: 0;
      padding: 10px;
      color: #f1f5f9;
      display: flex;
      justify-content: center;
    }
    .widget-container {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    h2 {
      margin-top: 0;
      font-size: 18px;
      font-weight: 700;
      text-align: center;
      color: #fff;
    }
    p {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    input, select {
      width: 100%;
      box-sizing: border-box;
      background: rgba(2, 6, 23, 0.8);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 10px;
      color: #fff;
      font-size: 13px;
      outline: none;
      transition: border 0.2s;
    }
    input:focus, select:focus {
      border-color: #6366f1;
    }
    button {
      width: 100%;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 11px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 10px;
    }
    button:hover {
      background: #4338ca;
    }
    .success-msg {
      display: none;
      text-align: center;
      padding: 20px 0;
    }
    .success-msg h3 {
      color: #10b981;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="widget-container">
    <div id="booking-form-wrapper">
      <h2>Reserva tu Mesa</h2>
      <p>Completa tus datos para confirmar tu reserva al instante</p>
      <form id="booking-form">
        <input type="hidden" name="tenantId" value="${tenantId}">
        
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" name="customerName" required placeholder="Tu nombre">
        </div>
        
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="customerEmail" required placeholder="tu@email.com">
        </div>
        
        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" name="customerPhone" placeholder="+34 600 000 000">
        </div>
        
        <div class="form-group" style="display: flex; gap: 10px;">
          <div style="flex: 1;">
            <label>Personas</label>
            <select name="partySize">
              <option value="1">1 Persona</option>
              <option value="2" selected>2 Personas</option>
              <option value="3">3 Personas</option>
              <option value="4">4 Personas</option>
              <option value="6">6 Personas</option>
              <option value="8">8 Personas</option>
            </select>
          </div>
          <div style="flex: 2;">
            <label>Fecha y Hora</label>
            <input type="datetime-local" name="reservationTime" required>
          </div>
        </div>
        
        <button type="submit" id="submit-btn">Confirmar Reserva</button>
      </form>
    </div>
    
    <div id="success-message" class="success-msg">
      <h3>¡Reserva Recibida!</h3>
      <p>Hemos registrado tu reserva. Te esperamos pronto en nuestro local.</p>
      <button onclick="window.location.reload()">Hacer otra reserva</button>
    </div>
  </div>

  <script>
    document.getElementById('booking-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.innerText = 'Enviando...';

      const formData = new FormData(e.target);
      const payload = Object.fromEntries(formData.entries());

      try {
        const res = await fetch('/api/public/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Error al guardar la reserva');

        document.getElementById('booking-form-wrapper').style.display = 'none';
        document.getElementById('success-message').style.display = 'block';
      } catch (err) {
        alert(err.message || 'Error de red');
        btn.disabled = false;
        btn.innerText = 'Confirmar Reserva';
      }
    });
  </script>
</body>
</html>
    `;
  });
}
