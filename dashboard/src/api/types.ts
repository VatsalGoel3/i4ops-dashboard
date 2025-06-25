export enum PipelineStage {
  unassigned = 'unassigned',
  active = 'active',
  installing = 'installing',
  reserved = 'reserved',
  broken = 'broken',
}

export enum SecuritySeverity {
  critical = 'critical',
  high = 'high',
  medium = 'medium',
  low = 'low',
}

export enum SecurityRule {
  egress = 'egress',
  brute_force = 'brute_force',
  sudo = 'sudo',
  oom_kill = 'oom_kill',
  other = 'other',
}

export interface SecurityEvent {
  id: number;
  vmId: number;
  timestamp: string;
  source: string;
  message: string;
  severity: SecuritySeverity;
  rule: SecurityRule;
  ackAt?: string | null;
  createdAt: string;
  vm?: {
    name: string;
    machineId: string;
    host: {
      name: string;
    };
  };
}

export interface SecurityEventStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unacknowledged: number;
}

export interface SecurityEventFilters {
  vmId?: number;
  severity?: SecuritySeverity;
  rule?: SecurityRule;
  since?: string;
  until?: string;
  acknowledged?: boolean;
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