import { PrismaClient, HostStatus, PipelineStage } from '@prisma/client';

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
      name: data.name,
      ip: data.ip,
      os: data.os,
      uptime: data.uptime,
      status: data.status as HostStatus || HostStatus.down,
      ssh: data.ssh,
      cpu: data.cpu,
      ram: data.ram,
      disk: data.disk,
      pipelineStage: data.pipelineStage as PipelineStage || PipelineStage.unassigned,
      assignedTo: data.assignedTo,
      notes: data.notes
    }
  });
}

export async function updateHostService(id: number, data: any) {
  const updatedData = {
    ...data,
    status: data.status as HostStatus,
    pipelineStage: data.pipelineStage as PipelineStage
  };
  return prisma.host.update({
    where: { id },
    data: updatedData
  });
}

export async function deleteHostService(id: number) {
  return prisma.host.delete({ where: { id } });
}