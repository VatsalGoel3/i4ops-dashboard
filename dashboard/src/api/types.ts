export enum PipelineStage {
  Unassigned = 'Unassigned',
  Active = 'Active',
  Installing = 'Installing',
  Reserved = 'Reserved',
  Broken = 'Broken',
}

export interface VM {
  id: number;
  name: string;
  machineId: string;
  status: 'up' | 'down';
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
}

export interface VMFilters {
  status?: 'up' | 'down';
  hostId?: number;
  name?: string;
}