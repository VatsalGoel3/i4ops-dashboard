import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const querySchema = z.object({
  entity: z.enum(['Host', 'VM']),
  entityId: z.coerce.number().int().positive(),
});

router.get('/', async (req, res) => {
  const parse = querySchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }

  const { entity, entityId } = parse.data;

  try {
    const logs = await prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { time: 'desc' },
    });

    res.json({ data: logs });
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;