export interface VM {
  id: number;
  name: string;
  status: string;
  cpu: number;
  ram: number;
  disk: number;
  os: string;
  uptime: number;
  xml: string;
  networkIp: string | null;
  networkMac: string | null;
  hostId: number;
  pipelineStage: string;
  assignedTo?: string | null;
  notes?: string | null;
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
  status: string;
  ssh: boolean;
  cpu: number;
  ram: number;
  disk: number;
  pipelineStage: string;
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
  status?: string;
  hostId?: number;
  name?: string;
}