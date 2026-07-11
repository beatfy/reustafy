import fastify from 'fastify';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';
import { getDb } from '@reustafy/database';

// Load Env
dotenv.config();

// Initialize DB pool connection eagerly
try {
  getDb();
  console.log('Database connection pool initialized.');
} catch (error) {
  console.error('Failed to initialize database connection:', error);
}

const server = fastify({
  logger: true
});

// Register CORS
server.register(cors, {
  origin: '*', // Allow all origins for dev/SaaS testing
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

// Import Routes
import { authRoutes } from './routes/auth';
import { tableRoutes } from './routes/tables';
import { orderRoutes } from './routes/orders';
import { logRoutes } from './routes/logs';
import { reservationRoutes } from './routes/reservations';
import { financeRoutes } from './routes/finance';
import { loyaltyRoutes } from './routes/loyalty';

// Register Routes
server.register(authRoutes, { prefix: '/api/auth' });
server.register(tableRoutes, { prefix: '/api' });
server.register(orderRoutes, { prefix: '/api' });
server.register(logRoutes, { prefix: '/api' });
server.register(reservationRoutes, { prefix: '/api' });
server.register(financeRoutes, { prefix: '/api/finance' });
server.register(loyaltyRoutes, { prefix: '/api' });

// Health Check
server.get('/health', async () => {
  return { status: 'healthy', timestamp: new Date() };
});

// Root API Welcome Route
server.get('/', async () => {
  return { 
    name: 'Reustafy Multi-Tenant API', 
    status: 'online', 
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/login',
      tables: '/api/tables',
      reservations: '/api/reservations',
      publicWidget: '/public-widget?tenantId=<tenant_id>'
    }
  };
});

// Serve the public widget HTML (direct root path fallback)
server.get('/public-widget', async (req, reply) => {
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
        
        <div class="form-group">
          <label>Alergias o Intolerancias</label>
          <input type="text" name="allergies" placeholder="Gluten, marisco, lactosa (O dejar vacío)">
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

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
