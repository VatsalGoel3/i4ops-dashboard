import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { Logger } from '../../infrastructure/logger';
import { triggerManualSync, getSecurityJobStatus } from '../../jobs/security-scheduler';

const router = Router();
const prisma = new PrismaClient();
const logger = new Logger('SecurityAPI');

// Validation schemas
const securityEventFiltersSchema = z.object({
  vmId: z.coerce.number().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  rule: z.enum(['egress', 'brute_force', 'sudo', 'oom_kill', 'other']).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  acknowledged: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const acknowledgeRequestSchema = z.object({
  ids: z.array(z.number()),
});

const processLogsRequestSchema = z.object({
  vmDirectory: z.string().optional(),
  forceRefresh: z.boolean().default(false),
});

/**
 * GET /api/security-events
 * Get security events with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const filters = securityEventFiltersSchema.parse(req.query);
    
    // Build where clause
    const whereClause: any = {};
    
    if (filters.vmId) whereClause.vmId = filters.vmId;
    if (filters.severity) whereClause.severity = filters.severity;
    if (filters.rule) whereClause.rule = filters.rule;
    if (filters.since) whereClause.timestamp = { gte: new Date(filters.since) };
    if (filters.until) {
      whereClause.timestamp = { 
        ...(whereClause.timestamp || {}), 
        lte: new Date(filters.until) 
      };
    }
    if (filters.acknowledged !== undefined) {
      whereClause.ackAt = filters.acknowledged ? { not: null } : null;
    }

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where: whereClause,
        include: {
          vm: {
            include: {
              host: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.securityEvent.count({ where: whereClause }),
    ]);

    res.json({
      data: events.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString(),
        ackAt: event.ackAt?.toISOString() || null,
        createdAt: event.createdAt.toISOString(),
        vm: event.vm ? {
          name: event.vm.name,
          machineId: event.vm.machineId,
          host: { name: event.vm.host?.name }
        } : null,
      })),
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    });
  } catch (error) {
    logger.error('Failed to get security events', error);
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

/**
 * GET /api/security-events/stats
 * Get security event statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(since as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last24hDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalStats, last24hCount] = await Promise.all([
      prisma.securityEvent.groupBy({
        by: ['severity'],
        where: { timestamp: { gte: sinceDate } },
        _count: true,
      }),
      prisma.securityEvent.count({
        where: { timestamp: { gte: last24hDate } }
      }),
    ]);

    const [acknowledged, unacknowledged] = await Promise.all([
      prisma.securityEvent.count({
        where: { 
          timestamp: { gte: sinceDate },
          ackAt: { not: null }
        }
      }),
      prisma.securityEvent.count({
        where: { 
          timestamp: { gte: sinceDate },
          ackAt: null
        }
      }),
    ]);

    const stats = {
      total: totalStats.reduce((sum, stat) => sum + stat._count, 0),
      critical: totalStats.find(s => s.severity === 'critical')?._count || 0,
      high: totalStats.find(s => s.severity === 'high')?._count || 0,
      medium: totalStats.find(s => s.severity === 'medium')?._count || 0,
      low: totalStats.find(s => s.severity === 'low')?._count || 0,
      last24h: last24hCount,
      acknowledged,
      unacknowledged,
    };

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get security event stats', error);
    res.status(500).json({ error: 'Failed to get security event stats' });
  }
});

/**
 * GET /api/security-events/critical
 * Get recent critical/high severity events
 */
router.get('/critical', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const events = await prisma.securityEvent.findMany({
      where: {
        severity: { in: ['critical', 'high'] }
      },
      include: {
        vm: {
          include: {
            host: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    res.json(events.map(event => ({
      ...event,
      timestamp: event.timestamp.toISOString(),
      ackAt: event.ackAt?.toISOString() || null,
      createdAt: event.createdAt.toISOString(),
      vm: event.vm ? {
        name: event.vm.name,
        machineId: event.vm.machineId,
        host: { name: event.vm.host?.name }
      } : null,
    })));
  } catch (error) {
    logger.error('Failed to get critical security events', error);
    res.status(500).json({ error: 'Failed to get critical security events' });
  }
});

/**
 * PUT /api/security-events/:id/acknowledge
 * Acknowledge a specific security event
 */
router.put('/:id/acknowledge', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    const event = await prisma.securityEvent.update({
      where: { id: eventId, ackAt: null },
      data: { ackAt: new Date() },
      include: {
        vm: {
          include: {
            host: {
              select: { name: true }
            }
          }
        }
      }
    });

    res.json({
      ...event,
      timestamp: event.timestamp.toISOString(),
      ackAt: event.ackAt?.toISOString() || null,
      createdAt: event.createdAt.toISOString(),
      vm: event.vm ? {
        name: event.vm.name,
        machineId: event.vm.machineId,
        host: { name: event.vm.host?.name }
      } : null,
    });
  } catch (error) {
    logger.error('Failed to acknowledge security event', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Security event not found or already acknowledged' });
    } else {
      res.status(500).json({ error: 'Failed to acknowledge security event' });
    }
  }
});

/**
 * PUT /api/security-events/acknowledge
 * Acknowledge multiple security events
 */
router.put('/acknowledge', async (req, res) => {
  try {
    const { ids } = acknowledgeRequestSchema.parse(req.body);
    
    const result = await prisma.securityEvent.updateMany({
      where: { 
        id: { in: ids },
        ackAt: null
      },
      data: { ackAt: new Date() }
    });

    res.json({ 
      acknowledged: result.count,
      requested: ids.length 
    });
  } catch (error) {
    logger.error('Failed to acknowledge multiple security events', error);
    res.status(500).json({ error: 'Failed to acknowledge security events' });
  }
});

/**
 * POST /api/security-events/process-logs
 * Trigger manual security log sync from u0
 */
router.post('/process-logs', async (req, res) => {
  try {
    logger.info('Manual security log sync requested');
    
    const result = await triggerManualSync();
    
    res.json({
      message: result.message,
      status: result.processing ? 'processing' : 'ready',
      syncMethod: 'SSH to u0',
      interval: 'Manual trigger'
    });
  } catch (error) {
    logger.error('Failed to trigger manual sync', error);
    res.status(500).json({ error: 'Failed to trigger security sync' });
  }
});

/**
 * POST /api/security-events/scan-vm-logs
 * Trigger comprehensive security log sync from u0
 */
router.post('/scan-vm-logs', async (req, res) => {
  try {
    logger.info('Comprehensive VM log sync requested');
    
    const result = await triggerManualSync();
    
    res.json({
      message: result.message,
      status: result.processing ? 'syncing' : 'ready',
      syncMethod: 'SSH to u0',
      frequency: 'Every minute (automatic)',
      manualTrigger: true
    });
  } catch (error) {
    logger.error('Failed to trigger VM log sync', error);
    res.status(500).json({ error: 'Failed to start VM log sync' });
  }
});

/**
 * GET /api/security-events/status
 * Get security monitoring system status
 */
router.get('/status', async (req, res) => {
  try {
    const status = getSecurityJobStatus();
    
    res.json({
      ...status,
      timestamp: new Date().toISOString(),
      version: '2.0',
      description: 'SSH-based log sync from u0'
    });
  } catch (error) {
    logger.error('Failed to get security status', error);
    res.status(500).json({ error: 'Failed to get security status' });
  }
});

export default router; 