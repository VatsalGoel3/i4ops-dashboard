import express from 'express';
import {
  getSecurityEvents,
  getSecurityEventStats,
  getRecentSecurityEvents,
  getSecurityEventById,
  getVMsWithSecurityEvents
} from '../controllers/security-events.controller';

const router = express.Router();

// Get security events with filtering and pagination
router.get('/', getSecurityEvents);

// Get security event statistics
router.get('/stats', getSecurityEventStats);

// Get recent security events
router.get('/recent', getRecentSecurityEvents);

// Get VMs that have security events
router.get('/vms', getVMsWithSecurityEvents);

// Get specific security event by ID
router.get('/:id', getSecurityEventById);

export default router; 