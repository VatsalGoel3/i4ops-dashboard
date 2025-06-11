import { Request, Response } from 'express';
import {
  getAllVMsService,
  getVMByIdService,
  createVMService,
  updateVMService,
  deleteVMService
} from '../services/vm.service';

export async function getAllVMs(req: Request, res: Response) {
  try {
    const hostId = req.query.hostId ? Number(req.query.hostId) : undefined;
    const vms = await getAllVMsService(hostId);
    res.json(vms);
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
  try {
    const newVM = await createVMService(req.body);
    res.status(201).json(newVM);
  } catch (err) {
    console.error('Error creating VM:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateVM(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const updated = await updateVMService(id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Error updating VM:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteVM(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await deleteVMService(id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting VM:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}