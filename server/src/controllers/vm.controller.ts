import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

import {
  getAllVMsService,
  getVMByIdService,
  createVMService,
  updateVMService,
  deleteVMService,
  getAllVMFileTelemetry, // ✅ new
} from '../services/vm.service';
import { vmSchema } from '../schemas/vm.schema';
import { broadcast } from '../events';

const prisma = new PrismaClient();

export async function getAllVMs(req: Request, res: Response) {
  try {
    const result = await getAllVMsService(req.query);
    res.json(result);
  } catch (err) {
    console.error('Error fetching VMs:', err);
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
    console.error('Error fetching VM by ID:', err);
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
    console.error('Error creating VM:', err);
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
      include: { host: true },
    });
    if (!fullVM) return res.status(404).json({ error: 'VM not found after update' });

    broadcast('vm-update', fullVM);
    res.json(fullVM);
  } catch (err) {
    console.error('Error updating VM:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteVM(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await deleteVMService(id);
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting VM:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getVMFileTelemetry(req: Request, res: Response) {
  try {
    const data = await getAllVMFileTelemetry();
    res.json(data);
  } catch (err) {
    console.error('Error fetching VM telemetry from disk:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}