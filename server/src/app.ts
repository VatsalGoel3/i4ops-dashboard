import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import hostRoutes from './routes/host.routes';
import vmRoutes from './routes/vm.routes';
import pollHistoryRouter from './routes/api/poll-history';
import { startPollingJob } from './jobs/poll-scheduler';

dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('i4ops Dashboard Backend is up and running.');
});

app.use('/api/hosts', hostRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api', pollHistoryRouter);

startPollingJob();

export default app;