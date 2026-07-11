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
