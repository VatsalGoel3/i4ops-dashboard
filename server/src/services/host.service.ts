import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getAllHostsService() {
  return prisma.host.findMany({
    include: { vms: true },
    orderBy: { name: 'asc' }
  });
}

export async function getHostByIdService(id: number) {
  return prisma.host.findUnique({
    where: { id },
    include: { vms: true }
  });
}

export async function createHostService(data: any) {
  return prisma.host.create({
    data: {
      ...data,
      pipelineStage: data.pipelineStage || 'unassigned'
    }
  });
}

export async function updateHostService(id: number, data: any) {
  return prisma.host.update({
    where: { id },
    data
  });
}

export async function deleteHostService(id: number) {
  return prisma.host.delete({ where: { id } });
}