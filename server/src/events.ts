import { Response, Request } from 'express';

type SSEClient = {
  id: number;
  res: Response;
};

const clients: SSEClient[] = [];

export function addClient(req: Request, res: Response): number {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');

  const clientId = Date.now();
  clients.push({ id: clientId, res });

  req.on('close', () => {
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx !== -1) clients.splice(idx, 1);
  });

  return clientId;
}

export function broadcast(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.res.write(payload);
  }
}