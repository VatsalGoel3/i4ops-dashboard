import { PrismaClient, VMStatus, PipelineStage } from '@prisma/client';

const prisma = new PrismaClient();

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
      pipelineStage: data.pipelineStage as PipelineStage || PipelineStage.unassigned,
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
  return prisma.vM.delete({ where: { id } });
}