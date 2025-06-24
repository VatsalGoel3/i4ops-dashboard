import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/poll-history', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 50); // Default 5, max 50
    
    const history = await prisma.pollHistory.findMany({
      orderBy: { time: 'desc' },
      take: limit,
    });
    res.json(history);
  } catch (err) {
    console.error('Error fetching poll history:', err);
    res.status(500).json({ error: 'Could not load poll history' });
  }
});

export default router;