import { Router } from 'express';
import {
  getSecurityEvents,
  getSecurityEventById,
  acknowledgeSecurityEvent,
  acknowledgeMultipleEvents,
  getSecurityEventStats,
  getCriticalEvents,
  manualProcessLogs,
  cleanupDuplicateEvents,
  testLogLineParsing
} from '../controllers/security-event.controller';
import { SecurityEventStream } from '../infrastructure/security-event-stream';

const router = Router();
const securityStream = new SecurityEventStream();

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
 * GET /api/security-events/stream
 * Server-Sent Events endpoint for real-time security events
 * Query params: severity, rules, vmIds (for filtering)
 */
router.get('/stream', (req, res) => {
  const filters = {
    severity: req.query.severity,
    rules: req.query.rules,
    vmIds: req.query.vmIds
  };
  
  securityStream.addClient(req, res, filters);
});

/**
 * GET /api/security-events/stream/stats
 * Get stream statistics
 */
router.get('/stream/stats', (req, res) => {
  res.json(securityStream.getStats());
});

/**
 * POST /api/security-events/process-logs
 * Manually trigger log processing for testing/debugging
 */
router.post('/process-logs', manualProcessLogs);

/**
 * POST /api/security-events/cleanup-duplicates
 * Remove duplicate security events
 */
router.post('/cleanup-duplicates', cleanupDuplicateEvents);

/**
 * POST /api/security-events/test-parsing
 * Test log line parsing (debugging)
 */
router.post('/test-parsing', testLogLineParsing);

/**
 * PUT /api/security-events/acknowledge
 * Body: { ids: number[] }
 */
router.put('/acknowledge', acknowledgeMultipleEvents);

/**
 * GET /api/security-events/:id
 * IMPORTANT: This must come after all other specific routes to avoid conflicts
 */
router.get('/:id', getSecurityEventById);

/**
 * PUT /api/security-events/:id/acknowledge
 */
router.put('/:id/acknowledge', acknowledgeSecurityEvent);

export default router;
export { securityStream }; 