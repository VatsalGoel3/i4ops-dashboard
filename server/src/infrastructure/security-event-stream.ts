import { SecurityEvent, SecuritySeverity, SecurityRule } from '@prisma/client';
import { Logger } from './logger';
import { Response, Request } from 'express';

interface SecurityEventClient {
  id: string;
  res: Response;
  filters: {
    severity?: SecuritySeverity[];
    rules?: SecurityRule[];
    vmIds?: number[];
  };
  lastHeartbeat: number;
}

interface SecurityEventMessage {
  type: 'event' | 'heartbeat' | 'stats' | 'error';
  data: any;
  timestamp: number;
}

export class SecurityEventStream {
  private logger: Logger;
  private clients = new Map<string, SecurityEventClient>();
  private messageQueue = new Map<string, SecurityEventMessage[]>();
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly CLIENT_TIMEOUT = 300000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.logger = new Logger('SecurityEventStream');
    
    // Clean up stale clients periodically
    setInterval(() => this.cleanupStaleClients(), 60000); // Every minute
    
    // Send heartbeats to keep connections alive
    setInterval(() => this.sendHeartbeats(), this.HEARTBEAT_INTERVAL);
  }

  addClient(req: Request, res: Response, filters: any = {}): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write('data: {"type":"connected","clientId":"' + clientId + '","timestamp":' + Date.now() + '}\n\n');

    const client: SecurityEventClient = {
      id: clientId,
      res,
      filters: this.parseFilters(filters),
      lastHeartbeat: Date.now()
    };

    this.clients.set(clientId, client);
    this.messageQueue.set(clientId, []);

    // Handle client disconnect
    req.on('close', () => {
      this.removeClient(clientId);
    });

    req.on('error', () => {
      this.removeClient(clientId);
    });

    this.logger.info(`Security event client connected: ${clientId}`);
    return clientId;
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.res.end();
      } catch (error) {
        // Client already disconnected
      }
      this.clients.delete(clientId);
      this.messageQueue.delete(clientId);
      this.logger.info(`Security event client disconnected: ${clientId}`);
    }
  }

  broadcastSecurityEvent(event: SecurityEvent & { vm?: any }): void {
    const message: SecurityEventMessage = {
      type: 'event',
      data: {
        id: event.id,
        vmId: event.vmId,
        vmName: event.vm?.name || 'Unknown',
        hostName: event.vm?.host?.name || 'Unknown',
        timestamp: event.timestamp,
        source: event.source,
        message: event.message,
        severity: event.severity,
        rule: event.rule,
        acknowledged: !!event.ackAt
      },
      timestamp: Date.now()
    };

    this.broadcastToClients(message, (client) => this.shouldSendToClient(client, event));
  }

  broadcastStats(stats: any): void {
    const message: SecurityEventMessage = {
      type: 'stats',
      data: stats,
      timestamp: Date.now()
    };

    this.broadcastToClients(message);
  }

  broadcastError(error: string): void {
    const message: SecurityEventMessage = {
      type: 'error',
      data: { error },
      timestamp: Date.now()
    };

    this.broadcastToClients(message);
  }

  private parseFilters(filters: any): SecurityEventClient['filters'] {
    const parsed: SecurityEventClient['filters'] = {};

    if (filters.severity) {
      if (Array.isArray(filters.severity)) {
        parsed.severity = filters.severity;
      } else if (typeof filters.severity === 'string') {
        parsed.severity = [filters.severity as SecuritySeverity];
      }
    }

    if (filters.rules) {
      if (Array.isArray(filters.rules)) {
        parsed.rules = filters.rules;
      } else if (typeof filters.rules === 'string') {
        parsed.rules = [filters.rules as SecurityRule];
      }
    }

    if (filters.vmIds) {
      if (Array.isArray(filters.vmIds)) {
        parsed.vmIds = filters.vmIds.map((id: any) => parseInt(id));
      } else if (typeof filters.vmIds === 'string' || typeof filters.vmIds === 'number') {
        parsed.vmIds = [parseInt(filters.vmIds.toString())];
      }
    }

    return parsed;
  }

  private shouldSendToClient(client: SecurityEventClient, event: SecurityEvent): boolean {
    // Check severity filter
    if (client.filters.severity && !client.filters.severity.includes(event.severity)) {
      return false;
    }

    // Check rule filter
    if (client.filters.rules && !client.filters.rules.includes(event.rule)) {
      return false;
    }

    // Check VM ID filter
    if (client.filters.vmIds && !client.filters.vmIds.includes(event.vmId)) {
      return false;
    }

    return true;
  }

  private broadcastToClients(message: SecurityEventMessage, filter?: (client: SecurityEventClient) => boolean): void {
    const messageString = `data: ${JSON.stringify(message)}\n\n`;
    let sentCount = 0;
    let errorCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      try {
        // Apply filter if provided
        if (filter && !filter(client)) {
          continue;
        }

        // Check if client is still connected
        if (client.res.destroyed || client.res.writableEnded) {
          this.removeClient(clientId);
          continue;
        }

        // Queue message if too many pending
        const queue = this.messageQueue.get(clientId);
        if (queue && queue.length >= this.MAX_QUEUE_SIZE) {
          // Remove oldest message and add new one
          queue.shift();
        }
        queue?.push(message);

        // Send message
        client.res.write(messageString);
        sentCount++;

      } catch (error) {
        this.logger.warn(`Failed to send message to client ${clientId}`, error);
        this.removeClient(clientId);
        errorCount++;
      }
    }

    if (message.type === 'event') {
      this.logger.debug(`Broadcasted security event to ${sentCount} clients (${errorCount} errors)`);
    }
  }

  private cleanupStaleClients(): void {
    const now = Date.now();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastHeartbeat > this.CLIENT_TIMEOUT) {
        staleClients.push(clientId);
      }
    }

    for (const clientId of staleClients) {
      this.logger.info(`Removing stale client: ${clientId}`);
      this.removeClient(clientId);
    }

    if (staleClients.length > 0) {
      this.logger.info(`Cleaned up ${staleClients.length} stale clients`);
    }
  }

  private sendHeartbeats(): void {
    const heartbeat: SecurityEventMessage = {
      type: 'heartbeat',
      data: { timestamp: Date.now() },
      timestamp: Date.now()
    };

    // Update client heartbeat timestamps
    for (const client of this.clients.values()) {
      client.lastHeartbeat = Date.now();
    }

    this.broadcastToClients(heartbeat);
  }

  getStats(): any {
    return {
      connectedClients: this.clients.size,
      totalQueuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      averageQueueSize: this.clients.size > 0 ? 
        Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0) / this.clients.size : 0
    };
  }

  shutdown(): void {
    this.logger.info('Shutting down security event stream...');
    
    // Disconnect all clients
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }

    this.logger.info('Security event stream shutdown complete');
  }
} 