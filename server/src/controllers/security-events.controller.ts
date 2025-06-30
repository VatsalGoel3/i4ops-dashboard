import { Request, Response } from 'express';
import { z } from 'zod';
import { SecurityEventsService, SecurityEventFilters } from '../services/security-events.service';
import { Logger } from '../infrastructure/logger';
import { SecurityEventType, SecurityEventSeverity } from '@prisma/client';

const logger = new Logger('SecurityEventsController');
const securityEventsService = new SecurityEventsService();

// Validation schemas
const getSecurityEventsSchema = z.object({
  vmName: z.string().optional(),
  hostName: z.string().optional(),
  eventType: z.nativeEnum(SecurityEventType).optional(),
  severity: z.nativeEnum(SecurityEventSeverity).optional(),
  logType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export async function getSecurityEvents(req: Request, res: Response) {
  try {
    const parseResult = getSecurityEventsSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: parseResult.error.errors 
      });
    }

    const filters: SecurityEventFilters = {
      ...parseResult.data,
      startDate: parseResult.data.startDate ? new Date(parseResult.data.startDate) : undefined,
      endDate: parseResult.data.endDate ? new Date(parseResult.data.endDate) : undefined,
    };

    const result = await securityEventsService.getSecurityEvents(filters);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching security events', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSecurityEventStats(req: Request, res: Response) {
  try {
    const stats = await securityEventsService.getSecurityEventStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching security event stats', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRecentSecurityEvents(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const events = await securityEventsService.getRecentSecurityEvents(limit);
    res.json({ events });
  } catch (error) {
    logger.error('Error fetching recent security events', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSecurityEventById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await securityEventsService.getSecurityEventById(id);
    if (!event) {
      return res.status(404).json({ error: 'Security event not found' });
    }

    res.json(event);
  } catch (error) {
    logger.error('Error fetching security event by ID', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getVMsWithSecurityEvents(req: Request, res: Response) {
  try {
    const vms = await securityEventsService.getVMsWithSecurityEvents();
    res.json({ vms });
  } catch (error) {
    logger.error('Error fetching VMs with security events', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 