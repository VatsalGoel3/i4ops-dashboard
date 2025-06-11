import { Request, Response } from 'express';
import {
  getAllHostsService,
  getHostByIdService,
  createHostService,
  updateHostService,
  deleteHostService
} from '../services/host.service';

export async function getAllHosts(_req: Request, res: Response) {
  try {
    const hosts = await getAllHostsService();
    res.json(hosts);
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
  try {
    const newHost = await createHostService(req.body);
    res.status(201).json(newHost);
  } catch (err) {
    console.error('Error creating host:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateHost(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const updated = await updateHostService(id, req.body);
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