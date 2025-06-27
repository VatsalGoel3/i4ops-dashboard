import { Request, Response } from 'express';
import { SecurityEventService, SecurityEventFilters } from '../services/security-event.service';
import { SecurityLogParser } from '../infrastructure/security-log-parser';
import { SecuritySeverity, SecurityRule } from '@prisma/client';
import { Logger } from '../infrastructure/logger';
import { env } from '../config/env';

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
    
    // Validate and parse vmId
    if (vmId) {
      const parsedVmId = parseInt(vmId as string);
      if (isNaN(parsedVmId) || parsedVmId <= 0) {
        return res.status(400).json({ error: 'Invalid vmId parameter' });
      }
      filters.vmId = parsedVmId;
    }
    
    if (severity) filters.severity = severity as SecuritySeverity;
    if (rule) filters.rule = rule as SecurityRule;
    if (since) filters.since = new Date(since as string);
    if (until) filters.until = new Date(until as string);
    if (acknowledged !== undefined) filters.acknowledged = acknowledged === 'true';

    // Validate and parse pagination parameters
    const parsedPage = parseInt(page as string);
    const parsedLimit = parseInt(limit as string);
    
    if (isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({ error: 'Invalid page parameter' });
    }
    
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }

    const result = await securityEventService.getEvents(
      filters,
      parsedPage,
      Math.min(parsedLimit, 100) // Cap at 100
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
    
    // Validate that the ID is a valid number
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

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
    
    // Validate that the ID is a valid number
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

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
    
    // Validate and parse limit parameter
    const parsedLimit = parseInt(limit as string);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }
    
    const events = await securityEventService.getRecentCriticalEvents(
      Math.min(parsedLimit, 50)
    );
    
    res.json(events);
  } catch (error) {
    logger.error('Failed to get critical events', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function manualProcessLogs(req: Request, res: Response) {
  try {
    // Determine if we should use SSH mode
    const fs = require('fs');
    const useSSH = !fs.existsSync(env.SECURITY_LOG_DIR);
    
    const parser = new SecurityLogParser(env.SECURITY_LOG_DIR, useSSH);
    const result = await parser.manualProcessLogs();
    
    res.json({
      success: true,
      message: `Processed ${result.processed} log files and found ${result.events} security events`,
      mode: useSSH ? 'SSH' : 'Local',
      ...result
    });
  } catch (error) {
    logger.error('Failed to manually process logs', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process logs',
      details: (error as Error).message 
    });
  }
}

export async function cleanupDuplicateEvents(req: Request, res: Response) {
  try {
    const result = await securityEventService.cleanupDuplicateEvents();
    
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} duplicate security events`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Failed to cleanup duplicate events', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cleanup duplicate events',
      details: (error as Error).message 
    });
  }
}

export async function testLogLineParsing(req: Request, res: Response) {
  try {
    const { logLine, vmName = 'u2-vm30000', source = 'kern.log' } = req.body;
    
    if (!logLine) {
      return res.status(400).json({ error: 'logLine is required' });
    }

    const parser = new SecurityLogParser(env.SECURITY_LOG_DIR, false);
    
    // Test pattern matching
    const patterns = {
      egress: /kernel:.*egress\s*\(\d+\)\s*pid\s+(\d+)\s+read\s+(\([^)]+\)|\S+)\s+write\s+(\S*)\s+uid\s+(\d+)\s+gid\s+(\d+)/i,
      brute_force: /sshd\[\d+\]:\s*Failed\s+password\s+for\s+(\w+)\s+from\s+([\d.]+)/i,
      sudo: /sudo:\s*(?:(\w+)\s*:\s*.*|pam_unix\(sudo:session\):\s*session\s+(?:opened|closed)\s+for\s+user\s+(\w+))/i,
      oom_kill: /kernel:.*Out\s+of\s+memory:\s*Kill\s+process\s+(\d+)/i
    };

    const results: any = {
      logLine,
      vmName,
      source,
      patterns: {}
    };

    // Test each pattern
    for (const [name, pattern] of Object.entries(patterns)) {
      const match = logLine.match(pattern);
      results.patterns[name] = {
        matched: !!match,
        groups: match ? match.slice(1) : null,
        fullMatch: match ? match[0] : null
      };
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Failed to test log line parsing', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test log line parsing',
      details: (error as Error).message 
    });
  }
} 