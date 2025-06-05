import { Router } from 'express';
import {
  getAllVMs,
  getVMById,
  createVM,
  updateVM,
  deleteVM
} from '../controllers/vm.controller';

const router = Router();

/**
 * GET /api/vms
 *   - Returns all VMs (optionally filter by hostId via query)
 */
router.get('/', getAllVMs);

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