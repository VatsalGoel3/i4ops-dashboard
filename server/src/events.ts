import { Response, Request } from 'express';
import { Logger } from './infrastructure/logger';

type SSEClient = {
  id: number;
  res: Response;
  connected: boolean;
};

const clients: SSEClient[] = [];
const logger = new Logger('Events');

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