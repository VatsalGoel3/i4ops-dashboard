import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../infrastructure/logger';

import {
  getAllVMsService,
  getVMByIdService,
  createVMService,
  updateVMService,
  deleteVMService,
  getAllVMFileTelemetry,
} from '../services/vm.service';
import { vmSchema } from '../schemas/vm.schema';
import { broadcast } from '../events';

const prisma = new PrismaClient();
const logger = new Logger('VMController');

export async function getAllVMs(req: Request, res: Response) {
  try {
    const result = await getAllVMsService(req.query);
    res.json(result);
  } catch (err) {
    logger.error('Error fetching VMs', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getVMById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const vm = await getVMByIdService(id);
    if (!vm) return res.status(404).json({ error: 'VM not found' });
    res.json(vm);
  } catch (err) {
    logger.error('Error fetching VM by ID', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createVM(req: Request, res: Response) {
  const result = vmSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', details: result.error.errors });
  }

  try {
    const newVM = await createVMService(result.data);
    res.status(201).json(newVM);
  } catch (err) {
    logger.error('Error creating VM', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateVM(req: Request, res: Response) {
  const id = Number(req.params.id);
  const result = vmSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', details: result.error.errors });
  }

  try {
    const oldVM = await getVMByIdService(id);
    if (!oldVM) return res.status(404).json({ error: 'VM not found' });

    await updateVMService(id, result.data);

    const user = (req.headers['x-user-email'] as string) || 'unknown';
    for (const field of Object.keys(result.data)) {
      const oldValue = (oldVM as any)[field];
      const newValue = (result.data as any)[field];
      if (oldValue !== newValue) {
        await prisma.auditLog.create({
          data: {
            entity: 'VM',
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

    const fullVM = await prisma.vM.findUnique({
      where: { id },
      include: { host: { select: { name: true, ip: true } } },
    });
    if (!fullVM) return res.status(404).json({ error: 'VM not found after update' });

    broadcast('vm-update', fullVM);
    res.json(fullVM);
  } catch (err) {
    logger.error('Error updating VM', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteVM(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await deleteVMService(id);
    return res.status(204).send();
  } catch (err) {
    logger.error('Error deleting VM', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getVMFileTelemetry(req: Request, res: Response) {
  try {
    const data = await getAllVMFileTelemetry();
    res.json(data);
  } catch (err) {
    logger.error('Error fetching VM telemetry from disk', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllVMsPaginated(req: Request, res: Response) {
  try {
    const { 
      cursor, 
      limit = '50', 
      sortBy = 'name', 
      sortOrder = 'asc',
      status,
      hostId,
      name
    } = req.query;

    const take = Math.min(parseInt(limit as string), 100); // Max 100 per page
    const orderDirection = sortOrder === 'desc' ? 'desc' : 'asc';

    // Build where clause with filters
    const where: any = {};
    if (status) where.status = status;
    if (hostId) where.hostId = parseInt(hostId as string);
    if (name) {
      where.name = {
        contains: name as string,
        mode: 'insensitive'
      };
    }

    // Build cursor clause
    const cursorClause = cursor ? {
      cursor: { id: parseInt(cursor as string) },
      skip: 1 // Skip the cursor record itself
    } : {};

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'name' || sortBy === 'machineId' || sortBy === 'ip' || sortBy === 'os' || sortBy === 'status') {
      orderBy[sortBy as string] = orderDirection;
    } else if (sortBy === 'uptime' || sortBy === 'cpu' || sortBy === 'ram' || sortBy === 'disk') {
      orderBy[sortBy as string] = orderDirection;
    } else if (sortBy === 'hostId') {
      orderBy.host = { name: orderDirection };
    } else {
      orderBy.name = orderDirection; // Default sort
    }

    const baseQuery = {
      where,
      include: {
        host: {
          select: {
            name: true,
            ip: true
          }
        }
      },
      orderBy,
      take: take + 1, // Fetch one extra to check if there are more
    };

    const vms = await prisma.vM.findMany(
      cursor ? { ...baseQuery, ...cursorClause } : baseQuery
    );

    // Check if there are more records
    const hasMore = vms.length > take;
    const data = hasMore ? vms.slice(0, take) : vms;

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
    console.error('Error in getAllVMsPaginated:', error);
    res.status(500).json({ 
      error: 'Failed to fetch paginated VMs',
      details: (error as Error).message 
    });
  }
}