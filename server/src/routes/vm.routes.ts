import { Router } from 'express';
import {
  getAllVMs,
  getVMById,
  createVM,
  updateVM,
  deleteVM
} from '../controllers/vm.controller';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const router = Router();

/**
 * GET /api/vms
 *   - Returns all VMs (optionally filter by hostId via query)
 */
router.get('/', getAllVMs);

/**
 * GET /api/vms/debug/io
 *   - Debug route to inspect VM diskIoRate
 */
router.get('/debug/io', async (_req, res) => {
  const vms = await prisma.vM.findMany({
    select: {
      name: true,
      hostId: true,
      diskIoRate: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.json(vms);
});

/**
 * GET /api/vms/:id
 *   - Returns a single VM
 */
router.get('/:id', getVMById);

/**
 * POST /api/vms
 *   - Create a new VM (body must include hostId)
 */
router.post('/', createVM);

/**
 * PUT /api/vms/:id
 *   - Update an existing VM
 */
router.put('/:id', updateVM);

/**
 * DELETE /api/vms/:id
 *   - Remove a VM
 */
router.delete('/:id', deleteVM);

export default router;