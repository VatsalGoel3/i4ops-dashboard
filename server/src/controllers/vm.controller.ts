import { Request, Response } from 'express';
import {
  getAllVMsService,
  getVMByIdService,
  createVMService,
  updateVMService,
  deleteVMService
} from '../services/vm.service';
import { vmSchema } from '../schemas/vm.schema';

export async function getAllVMs(req: Request, res: Response) {
  try {
    const result = await getAllVMsService(req.query);
    res.json(result); // { data, totalCount }
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
    const updated = await updateVMService(id, result.data);
    res.json(updated);
  } catch (err) {
    console.error('Error updating VM:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteVM(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const deleted = await deleteVMService(id);

    // Even if it was already deleted, return 204 for idempotency
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting VM:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}