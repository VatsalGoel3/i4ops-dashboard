import { Router } from 'express';
import {
  getSecurityEvents,
  getSecurityEventById,
  acknowledgeSecurityEvent,
  acknowledgeMultipleEvents,
  getSecurityEventStats,
  getCriticalEvents,
  manualProcessLogs
} from '../controllers/security-event.controller';

const router = Router();

/**
 * GET /api/security-events
 * Query params: page, limit, vmId, severity, rule, since, until, acknowledged
 */
router.get('/', getSecurityEvents);

/**
 * GET /api/security-events/stats
 * Query params: since
 */
router.get('/stats', getSecurityEventStats);

/**
 * GET /api/security-events/critical
 * Query params: limit
 */
router.get('/critical', getCriticalEvents);

/**
 * POST /api/security-events/process-logs
 * Manually trigger log processing for testing/debugging
 */
router.post('/process-logs', manualProcessLogs);

/**
 * GET /api/security-events/:id
 */
router.get('/:id', getSecurityEventById);

/**
 * PUT /api/security-events/:id/acknowledge
 */
router.put('/:id/acknowledge', acknowledgeSecurityEvent);

/**
 * PUT /api/security-events/acknowledge
 * Body: { ids: number[] }
 */
router.put('/acknowledge', acknowledgeMultipleEvents);

export default router; 