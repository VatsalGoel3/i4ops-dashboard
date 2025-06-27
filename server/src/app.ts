import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import hostRoutes from './routes/host.routes';
import vmRoutes from './routes/vm.routes';
import pollHistoryRouter from './routes/api/poll-history';
import auditLogRoutes from './routes/auditLogs';
import healthRoutes from './routes/health.routes';
import uploadRoutes from './routes/upload.routes';
import { startPollingJob, stopPollingJob } from './jobs/poll-scheduler';
import { addClient } from './events';
import { Logger } from './infrastructure/logger';
import { HealthMonitor } from './infrastructure/health-monitor';

const logger = new Logger('App');
const healthMonitor = new HealthMonitor();
const app = express();

app.use(cors({ 
  origin: [
    'http://localhost:8888',      // Development
    'http://100.76.195.14:8888',  // u0 deployment
    /^http:\/\/192\.168\.\d+\.\d+:8888$/,  // Local network
  ] 
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (_req, res) => {
  res.json({ 
    message: 'i4ops Dashboard Backend',
    version: '1.0.0',
    environment: env.NODE_ENV
  });
});

// SSE endpoint
app.get('/api/events', (req, res) => {
  addClient(req, res);
});

app.use('/api/hosts', hostRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api', pollHistoryRouter);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api', healthRoutes);
app.use('/api/upload', uploadRoutes);

// Start polling only after routes are set up
setTimeout(() => {
  startPollingJob();
  logger.info('Polling services started');
  
  // Log initial health summary
  setTimeout(() => {
    healthMonitor.logHealthSummary();
  }, 5000);
}, 1000);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown...');
  try {
    await stopPollingJob();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, starting graceful shutdown...');
  try {
    await stopPollingJob();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
});

// Periodic health logging
setInterval(() => {
  healthMonitor.logHealthSummary().catch(error => {
    logger.error('Failed to log health summary', error);
  });
}, 300000); // Every 5 minutes

export default app;