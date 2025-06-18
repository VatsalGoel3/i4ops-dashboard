import fs from 'fs/promises';
import path from 'path';
import { PrismaClient, VMStatus, PipelineStage } from '@prisma/client';

const prisma = new PrismaClient();
const TELEMETRY_DIR = '/mnt/vm-telemetry-json';

export async function getAllVMsService(query: any) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filters: any = {};
  if (query.hostId) filters.hostId = parseInt(query.hostId);
  if (query.status) filters.status = query.status;
  if (query.pipelineStage) filters.pipelineStage = query.pipelineStage;
  if (query.assignedTo) filters.assignedTo = query.assignedTo;

  const [data, totalCount] = await Promise.all([
    prisma.vM.findMany({
      where: filters,
      include: {
        host: {
          select: { name: true, ip: true }
        }
      },
      skip,
      take: limit
    }),
    prisma.vM.count({ where: filters })
  ]);

  return { data, totalCount };
}

export async function getVMByIdService(id: number) {
  return prisma.vM.findUnique({
    where: { id },
    include: {
      host: {
        select: { name: true, ip: true }
      }
    }
  });
}

export async function createVMService(data: any) {
  return prisma.vM.create({
    data: {
      name: data.name,
      status: data.status as VMStatus || VMStatus.stopped,
      cpu: data.cpu,
      ram: data.ram,
      disk: data.disk,
      os: data.os,
      uptime: data.uptime,
      xml: data.xml,
      networkIp: data.networkIp,
      networkMac: data.networkMac,
      pipelineStage: data.pipelineStage as PipelineStage || PipelineStage.Unassigned,
      assignedTo: data.assignedTo,
      notes: data.notes,
      host: { connect: { id: data.hostId } }
    }
  });
}

export async function updateVMService(id: number, data: any) {
  const updatedData = {
    ...data,
    status: data.status as VMStatus,
    pipelineStage: data.pipelineStage as PipelineStage
  };
  return prisma.vM.update({
    where: { id },
    data: updatedData
  });
}

export async function deleteVMService(id: number) {
  try {
    return await prisma.vM.delete({ where: { id } });
  } catch (err: any) {
    if (err.code === 'P2025') {
      // Record not found, treat as already deleted
      return null;
    }
    throw err;
  }
}

// ✅ NEW: Read VM telemetry files from /mnt/vm-telemetry-json
export async function getAllVMFileTelemetry(): Promise<any[]> {
  try {
    const files = await fs.readdir(TELEMETRY_DIR);
    const results = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(TELEMETRY_DIR, file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content);
        results.push(parsed);
      } catch (err) {
        console.warn(`Skipping file ${file}: invalid JSON or unreadable`);
        continue;
      }
    }

    return results;
  } catch (err) {
    console.error('Failed to read VM telemetry directory:', err);
    return [];
  }
}