import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/vms
 * Optional query: ?hostId=1
 */
export async function getAllVMs(req: Request, res: Response) {
  const hostId = req.query.hostId ? Number(req.query.hostId) : undefined;

  try {
    const vms = await prisma.vm.findMany({
      where: hostId ? { hostId } : {},
      include: {
        host: { select: { name: true, ip: true } }
      }
    });
    return res.json(vms);
  } catch (error) {
    console.error('Error fetching VMs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/vms/:id
 */
export async function getVMById(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const vm = await prisma.vm.findUnique({
      where: { id },
      include: {
        host: { select: { name: true, ip: true } }
      }
    });
    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }
    return res.json(vm);
  } catch (error) {
    console.error('Error fetching VM by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/vms
 * Body example:
 * {
 *   "name": "vm-cache-01",
 *   "status": "running",
 *   "cpu": 10.5,
 *   "ram": 20.3,
 *   "disk": 5.0,
 *   "os": "Ubuntu 20.04",
 *   "uptime": 1200,
 *   "xml": "<domain>…</domain>",
 *   "networkIp": "192.168.122.120",
 *   "networkMac": "52:54:00:12:34:56",
 *   "hostId": 1,
 *   "pipelineStage": "working",
 *   "assignedTo": "diana",
 *   "notes": "Running database load test"
 * }
 */
export async function createVM(req: Request, res: Response) {
  const {
    name,
    status,
    cpu,
    ram,
    disk,
    os,
    uptime,
    xml,
    networkIp,
    networkMac,
    hostId,
    pipelineStage,
    assignedTo,
    notes
  } = req.body;

  try {
    const newVM = await prisma.vm.create({
      data: {
        name,
        status,
        cpu,
        ram,
        disk,
        os,
        uptime,
        xml,
        networkIp,
        networkMac,
        pipelineStage: pipelineStage || 'unassigned',
        assignedTo,
        notes,
        host: { connect: { id: hostId } }
      }
    });
    return res.status(201).json(newVM);
  } catch (error) {
    console.error('Error creating VM:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/vms/:id
 */
export async function updateVM(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = req.body;
  try {
    const updated = await prisma.vm.update({
      where: { id },
      data
    });
    return res.json(updated);
  } catch (error) {
    console.error('Error updating VM:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/vms/:id
 */
export async function deleteVM(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    await prisma.vm.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting VM:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}