import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getAllVMsService(hostId?: number) {
  return prisma.vM.findMany({
    where: hostId ? { hostId } : {},
    include: { host: { select: { name: true, ip: true } } }
  });
}

export async function getVMByIdService(id: number) {
  return prisma.vM.findUnique({
    where: { id },
    include: { host: { select: { name: true, ip: true } } }
  });
}

export async function createVMService(data: any) {
  return prisma.vM.create({
    data: {
      ...data,
      pipelineStage: data.pipelineStage || 'unassigned',
      host: { connect: { id: data.hostId } }
    }
  });
}

export async function updateVMService(id: number, data: any) {
  return prisma.vM.update({
    where: { id },
    data
  });
}

export async function deleteVMService(id: number) {
  return prisma.vM.delete({ where: { id } });
}