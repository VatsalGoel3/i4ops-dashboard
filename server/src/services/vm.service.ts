import fs from 'fs/promises';
import path from 'path';
import { VMStatus } from '@prisma/client';
import { Logger } from '../infrastructure/logger';
import { prisma } from '../infrastructure/database';

const logger = new Logger('VMService');
const TELEMETRY_DIR = '/mnt/vm-telemetry-json';

export async function getAllVMsService(query: any) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filters: any = {};
  if (query.hostId) filters.hostId = parseInt(query.hostId);
  if (query.status) filters.status = query.status;

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
      machineId: data.machineId,
      status: data.status as VMStatus || VMStatus.offline,
      cpu: data.cpu,
      ram: data.ram,
      disk: data.disk,
      os: data.os,
      ip: data.ip,
      uptime: data.uptime,
      host: { connect: { id: data.hostId } }
    }
  });
}

export async function updateVMService(id: number, data: any) {
  const updatedData = {
    ...data,
    status: data.status as VMStatus,
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

// This should be REMOVED - telemetry is handled by TelemetryService now
export async function getAllVMFileTelemetry(): Promise<any[]> {
  logger.warn('Deprecated function called - use TelemetryService instead');
  return [];
}