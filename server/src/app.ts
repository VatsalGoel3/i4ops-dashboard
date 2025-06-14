import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import hostRoutes from './routes/host.routes';
import vmRoutes from './routes/vm.routes';
import pollHistoryRouter from './routes/api/poll-history';
import auditLogRoutes from './routes/auditLogs';
import { startPollingJob } from './jobs/poll-scheduler';
import { addClient } from './events';

dotenv.config();
const app = express();

app.use(cors({ origin: 'http://localhost:8888' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('i4ops Dashboard Backend is up and running.');
});

// SSE endpoint
app.get('/api/events', (req, res) => {
  addClient(req, res);
});

app.use('/api/hosts', hostRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api', pollHistoryRouter);
app.use('/api/audit-logs', auditLogRoutes);

startPollingJob();

export default app;