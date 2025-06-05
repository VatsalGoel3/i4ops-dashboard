import { Router } from 'express';
import {
  getAllHosts,
  getHostById,
  createHost,
  updateHost,
  deleteHost
} from '../controllers/host.controller';

const router = Router();

/** 
 * GET /api/hosts
 *   - Returns all hosts (including associated VMs)
 */
router.get('/', getAllHosts);

/**
 * GET /api/hosts/:id
 *   - Returns a single host by id (including VMs)
 */
router.get('/:id', getHostById);

/**
 * POST /api/hosts
 *   - Create a new host (body must match Host fields)
 */
router.post('/', createHost);

/**
 * PUT /api/hosts/:id
 *   - Update an existing host
 */
router.put('/:id', updateHost);

/**
 * DELETE /api/hosts/:id
 *   - Remove a host (and cascade delete its VMs)
 */
router.delete('/:id', deleteHost);

export default router;