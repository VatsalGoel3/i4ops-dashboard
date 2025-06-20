import { z } from 'zod';
import { VMStatus } from '@prisma/client';

export const vmSchema = z.object({
  name: z.string().min(1),
  machineId: z.string().min(1),
  status: z.nativeEnum(VMStatus),
  cpu: z.number().nonnegative(),
  ram: z.number().nonnegative(),
  disk: z.number().nonnegative(),
  os: z.string(),
  ip: z.string().ip(),
  uptime: z.number().int().nonnegative(),
  hostId: z.number().int().positive()
});

export type VMInput = z.infer<typeof vmSchema>;