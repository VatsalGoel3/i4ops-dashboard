export enum PipelineStage {
  unassigned = 'unassigned',
  active = 'active',
  installing = 'installing',
  reserved = 'reserved',
  broken = 'broken',
}

export interface VM {
  id: number;
  name: string;
  machineId: string;
  status: 'running' | 'stopped' | 'offline';
  cpu: number;
  ram: number;
  disk: number;
  os: string;
  ip: string;
  uptime: number;
  hostId: number;
  updatedAt: string;
  host?: {
    name: string;
    ip: string;
  };
}

export interface Host {
  id: number;
  name: string;
  ip: string;
  os: string;
  uptime: number;
  status: 'up' | 'down';
  ssh: boolean;
  cpu: number;
  ram: number;
  disk: number;
  pipelineStage: PipelineStage;
  assignedTo?: string | null;
  notes?: string | null;
  updatedAt: string;
  vms: VM[];
}

export interface HostFilters {
  os?: string;
  status?: string;
  vmCount?: number;
  ssh?: boolean;
  pipelineStage?: string;
}

export interface VMFilters {
  status?: 'running' | 'stopped' | 'offline';
  hostId?: number;
  name?: string;
}