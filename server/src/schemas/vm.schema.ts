import { z } from 'zod';
import { VMStatus, PipelineStage } from '@prisma/client';

export const vmSchema = z.object({
  name: z.string().min(1),
  status: z.nativeEnum(VMStatus),
  cpu: z.number().nonnegative(),
  ram: z.number().nonnegative(),
  disk: z.number().nonnegative(),
  os: z.string(),
  uptime: z.number().int().nonnegative(),
  xml: z.string(),
  networkIp: z.string().ip().optional(),
  networkMac: z.string().optional(),
  pipelineStage: z.nativeEnum(PipelineStage).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  hostId: z.number().int().positive()
});

export type VMInput = z.infer<typeof vmSchema>;