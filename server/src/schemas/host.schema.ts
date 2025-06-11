import { z } from 'zod';
import { HostStatus, PipelineStage } from '@prisma/client';

export const hostSchema = z.object({
  name: z.string().min(1),
  ip: z.string().ip(),
  os: z.string(),
  uptime: z.number().int().nonnegative(),
  status: z.nativeEnum(HostStatus),
  ssh: z.boolean(),
  cpu: z.number().nonnegative(),
  ram: z.number().nonnegative(),
  disk: z.number().nonnegative(),
  pipelineStage: z.nativeEnum(PipelineStage).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional()
});

export type HostInput = z.infer<typeof hostSchema>;