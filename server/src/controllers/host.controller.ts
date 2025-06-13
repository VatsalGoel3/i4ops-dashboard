import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

import {
  getAllHostsService,
  getHostByIdService,
  createHostService,
  updateHostService,
  deleteHostService,
} from '../services/host.service';
import { hostSchema } from '../schemas/host.schema';

const prisma = new PrismaClient();

export async function getAllHosts(req: Request, res: Response) {
  try {
    const result = await getAllHostsService(req.query);
    res.json(result);
  } catch (err) {
    console.error('Error fetching hosts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getHostById(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const host = await getHostByIdService(id);
    if (!host) return res.status(404).json({ error: 'Host not found' });
    res.json(host);
  } catch (err) {
    console.error('Error fetching host:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createHost(req: Request, res: Response) {
  const result = hostSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', details: result.error.errors });
  }

  try {
    const newHost = await createHostService(result.data);
    res.status(201).json(newHost);
  } catch (err) {
    console.error('Error creating host:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateHost(req: Request, res: Response) {
  const id = Number(req.params.id);
  const result = hostSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', details: result.error.errors });
  }

  try {
    const oldHost = await getHostByIdService(id);
    if (!oldHost) return res.status(404).json({ error: 'Host not found' });

    const updated = await updateHostService(id, result.data);

    const user = (req.headers['x-user-email'] as string) || 'unknown';
    for (const field of Object.keys(result.data)) {
      const oldValue = (oldHost as any)[field];
      const newValue = (result.data as any)[field];
      if (oldValue !== newValue) {
        await prisma.auditLog.create({
          data: {
            entity: 'Host',
            entityId: id,
            action: 'update',
            field,
            oldValue: oldValue != null ? String(oldValue) : null,
            newValue: newValue != null ? String(newValue) : null,
            user,
          },
        });
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating host:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteHost(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    await deleteHostService(id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting host:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}