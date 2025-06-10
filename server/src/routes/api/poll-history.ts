import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/poll-history', async (_, res) => {
  try {
    const history = await prisma.pollHistory.findMany({
      orderBy: { time: 'desc' },
      take: 5,
    });
    res.json(history);
  } catch (err) {
    console.error('Error fetching poll history:', err);
    res.status(500).json({ error: 'Could not load poll history' });
  }
});

export default router;