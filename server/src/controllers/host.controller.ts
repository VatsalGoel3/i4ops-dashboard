import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/hosts
 */
export async function getAllHosts(_req: Request, res: Response) {
  try {
    const hosts = await prisma.host.findMany({
      include: {
        vms: true
      }
    });
    return res.json(hosts);
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/hosts/:id
 */
export async function getHostById(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const host = await prisma.host.findUnique({
      where: { id },
      include: { vms: true }
    });
    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }
    return res.json(host);
  } catch (error) {
    console.error('Error fetching host by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/hosts
 * Body example:
 * {
 *   "name": "baremetal03",
 *   "ip": "100.64.0.3",
 *   "os": "Ubuntu 22.04",
 *   "uptime": 0,
 *   "status": "down",
 *   "ssh": false,
 *   "cpu": 0,
 *   "ram": 0,
 *   "disk": 0
 * }
 */
export async function createHost(req: Request, res: Response) {
  const { name, ip, os, uptime, status, ssh, cpu, ram, disk } = req.body;
  try {
    const newHost = await prisma.host.create({
      data: { name, ip, os, uptime, status, ssh, cpu, ram, disk }
    });
    return res.status(201).json(newHost);
  } catch (error) {
    console.error('Error creating host:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/hosts/:id
 * Body contains the fields to update
 */
export async function updateHost(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = req.body;
  try {
    const updated = await prisma.host.update({
      where: { id },
      data
    });
    return res.json(updated);
  } catch (error) {
    console.error('Error updating host:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/hosts/:id
 */
export async function deleteHost(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    await prisma.host.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting host:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}