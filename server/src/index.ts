import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import hostRoutes from './routes/host.routes';
import vmRoutes from './routes/vm.routes';
import pollNowRouter from './routes/internal/poll-now';
import { startPollingJob } from './jobs/poll-scheduler';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.send('i4ops Dashboard Backend is up and running.');
});

app.use('/api/hosts', hostRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api/internal', pollNowRouter);

startPollingJob();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});