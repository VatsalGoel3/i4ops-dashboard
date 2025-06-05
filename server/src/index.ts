import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import hostRoutes from './routes/host.routes';
import vmRoutes from './routes/vm.routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: 'http://localhost:3000' })); // allow your React frontend
app.use(express.json());

// Simple health check
app.get('/', (_req: Request, res: Response) => {
  res.send('i4ops Dashboard Backend is up and running.');
});

// Mount host & vm routers under /api
app.use('/api/hosts', hostRoutes);
app.use('/api/vms', vmRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});