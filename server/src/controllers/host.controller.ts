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
import { broadcast } from '../events';

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

    await updateHostService(id, result.data);

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

    // 🔁 Re-fetch updated host with VMs
    const fullHost = await prisma.host.findUnique({
      where: { id },
      include: { vms: true },
    });
    if (!fullHost) return res.status(404).json({ error: 'Host not found after update' });

    // 📡 Broadcast full host with VMs
    broadcast('host-update', fullHost);

    res.json(fullHost);
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

export async function getAllHostsPaginated(req: Request, res: Response) {
  try {
    const { 
      cursor, 
      limit = '50', 
      sortBy = 'name', 
      sortOrder = 'asc',
      os,
      status,
      vmCount
    } = req.query;

    const take = Math.min(parseInt(limit as string), 100); // Max 100 per page
    const orderDirection = sortOrder === 'desc' ? 'desc' : 'asc';

    // Build where clause with filters
    const where: any = {};
    if (os) where.os = os;
    if (status) where.status = status;
    if (vmCount !== undefined) {
      // This is more complex - we need to filter by VM count
      // For now, we'll fetch all and filter in application code
    }

    // Build cursor clause
    const cursorClause = cursor ? {
      cursor: { id: parseInt(cursor as string) },
      skip: 1 // Skip the cursor record itself
    } : {};

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'name' || sortBy === 'ip' || sortBy === 'os' || sortBy === 'status') {
      orderBy[sortBy as string] = orderDirection;
    } else if (sortBy === 'uptime' || sortBy === 'cpu' || sortBy === 'ram' || sortBy === 'disk') {
      orderBy[sortBy as string] = orderDirection;
    } else {
      orderBy.name = orderDirection; // Default sort
    }

    const baseQuery = {
      where,
      include: {
        vms: true
      },
      orderBy,
      take: take + 1, // Fetch one extra to check if there are more
    };

    const hosts = await prisma.host.findMany(
      cursor ? { ...baseQuery, ...cursorClause } : baseQuery
    );

    // Filter by VM count if specified (application-level filtering)
    let filteredHosts = hosts;
    if (vmCount !== undefined) {
      const targetVmCount = parseInt(vmCount as string);
      filteredHosts = hosts.filter(host => host.vms.length === targetVmCount);
    }

    // Check if there are more records
    const hasMore = filteredHosts.length > take;
    const data = hasMore ? filteredHosts.slice(0, take) : filteredHosts;

    // Generate next cursor
    const nextCursor = hasMore && data.length > 0 
      ? data[data.length - 1].id.toString() 
      : undefined;

    res.json({
      data,
      pagination: {
        nextCursor,
        hasMore,
        total: undefined // We don't calculate total for performance
      }
    });
  } catch (error) {
    console.error('Error in getAllHostsPaginated:', error);
    res.status(500).json({ 
      error: 'Failed to fetch paginated hosts',
      details: (error as Error).message 
    });
  }
}