import { Request, Response } from 'express';
import { SecurityEventService, SecurityEventFilters } from '../services/security-event.service';
import { SecuritySeverity, SecurityRule } from '@prisma/client';
import { Logger } from '../infrastructure/logger';

const securityEventService = new SecurityEventService();
const logger = new Logger('SecurityEventController');

export async function getSecurityEvents(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '50',
      vmId,
      severity,
      rule,
      since,
      until,
      acknowledged
    } = req.query;

    const filters: SecurityEventFilters = {};
    
    if (vmId) filters.vmId = parseInt(vmId as string);
    if (severity) filters.severity = severity as SecuritySeverity;
    if (rule) filters.rule = rule as SecurityRule;
    if (since) filters.since = new Date(since as string);
    if (until) filters.until = new Date(until as string);
    if (acknowledged !== undefined) filters.acknowledged = acknowledged === 'true';

    const result = await securityEventService.getEvents(
      filters,
      parseInt(page as string),
      Math.min(parseInt(limit as string), 100) // Cap at 100
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to get security events', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSecurityEventById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const event = await securityEventService.getEventById(id);
    
    if (!event) {
      return res.status(404).json({ error: 'Security event not found' });
    }

    res.json(event);
  } catch (error) {
    logger.error('Failed to get security event by ID', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function acknowledgeSecurityEvent(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const user = (req.headers['x-user-email'] as string) || 'unknown';
    
    const event = await securityEventService.acknowledgeEvent(id, user);
    res.json(event);
  } catch (error) {
    logger.error('Failed to acknowledge security event', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function acknowledgeMultipleEvents(req: Request, res: Response) {
  try {
    const { ids } = req.body;
    const user = (req.headers['x-user-email'] as string) || 'unknown';
    
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'number')) {
      return res.status(400).json({ error: 'Invalid request: ids must be an array of numbers' });
    }
    
    const count = await securityEventService.acknowledgeMultiple(ids, user);
    res.json({ acknowledged: count });
  } catch (error) {
    logger.error('Failed to acknowledge multiple security events', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSecurityEventStats(req: Request, res: Response) {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(since as string) : undefined;
    
    const stats = await securityEventService.getStats(sinceDate);
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get security event stats', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCriticalEvents(req: Request, res: Response) {
  try {
    const { limit = '10' } = req.query;
    const events = await securityEventService.getRecentCriticalEvents(
      Math.min(parseInt(limit as string), 50)
    );
    
    res.json(events);
  } catch (error) {
    logger.error('Failed to get critical events', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 