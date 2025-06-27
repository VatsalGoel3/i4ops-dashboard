import { Response, Request } from 'express';
import { Logger } from './infrastructure/logger';
import { PrismaClient } from '@prisma/client';

type SSEClient = {
  id: number;
  res: Response;
  connected: boolean;
};

const clients: SSEClient[] = [];
const logger = new Logger('Events');
const prisma = new PrismaClient();

export function addClient(req: Request, res: Response): number {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  res.write('\n');

  const clientId = Date.now();
  const client = { id: clientId, res, connected: true };
  clients.push(client);

  req.on('close', () => {
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      clients[idx].connected = false;
      clients.splice(idx, 1);
    }
    logger.debug(`SSE client ${clientId} disconnected`);
  });

  req.on('error', () => {
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      clients[idx].connected = false;
      clients.splice(idx, 1);
    }
  });

  logger.debug(`SSE client ${clientId} connected`);
  return clientId;
}

export function broadcast(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const disconnectedClients: number[] = [];

  for (const client of clients) {
    try {
      if (client.connected && !client.res.destroyed) {
        client.res.write(payload);
      } else {
        disconnectedClients.push(client.id);
      }
    } catch (error) {
      logger.warn(`Failed to send to SSE client ${client.id}`, error);
      disconnectedClients.push(client.id);
    }
  }

  // Clean up disconnected clients
  for (const clientId of disconnectedClients) {
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }
  }
}

export function getConnectedClients(): number {
  return clients.filter(c => c.connected).length;
}

export function closeAllConnections(): void {
  logger.info('Closing all SSE connections...');
  for (const client of clients) {
    try {
      if (client.connected) {
        client.res.end();
      }
    } catch (error) {
      // Client already disconnected
    }
  }
  clients.length = 0;
}

/**
 * Broadcast security event updates to all connected clients
 */
export async function broadcastSecurityUpdate(): Promise<void> {
  try {
    // Get recent critical security events for immediate notification
    const criticalEvents = await prisma.securityEvent.findMany({
      where: {
        severity: { in: ['critical', 'high'] },
        ackAt: null, // Only unacknowledged events
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      include: {
        vm: {
          include: {
            host: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get overall security stats
    const [stats, totalEvents] = await Promise.all([
      prisma.securityEvent.groupBy({
        by: ['severity'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        _count: true
      }),
      prisma.securityEvent.count({
        where: {
          ackAt: null // Unacknowledged
        }
      })
    ]);

    const securityStats = {
      total: totalEvents,
      critical: stats.find(s => s.severity === 'critical')?._count || 0,
      high: stats.find(s => s.severity === 'high')?._count || 0,
      medium: stats.find(s => s.severity === 'medium')?._count || 0,
      low: stats.find(s => s.severity === 'low')?._count || 0,
      unacknowledged: totalEvents
    };

    // Format critical events for broadcast
    const formattedCriticalEvents = criticalEvents.map(event => ({
      id: event.id,
      vmId: event.vmId,
      timestamp: event.timestamp.toISOString(),
      source: event.source,
      message: event.message,
      severity: event.severity,
      rule: event.rule,
      ackAt: event.ackAt?.toISOString() || null,
      createdAt: event.createdAt.toISOString(),
      vm: event.vm ? {
        name: event.vm.name,
        machineId: event.vm.machineId,
        host: { name: event.vm.host?.name }
      } : null
    }));

    // Broadcast security events update
    broadcast('security-events-update', {
      stats: securityStats,
      criticalEvents: formattedCriticalEvents,
      timestamp: new Date().toISOString()
    });

    // Individual critical event notifications
    for (const event of formattedCriticalEvents) {
      broadcast('security-event', event);
    }

    logger.info(`Broadcasted security update: ${criticalEvents.length} critical events, ${totalEvents} total unacknowledged`);
  } catch (error) {
    logger.error('Failed to broadcast security update:', error);
  }
}