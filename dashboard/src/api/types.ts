// dashboard/src/api/types.ts

export interface VM {
  id: number;
  name: string;
  status: string;       // "running", "stopped", etc.
  cpu: number;          // CPU usage %
  ram: number;          // RAM usage %
  disk: number;         // Disk usage %
  os: string;           // Guest OS
  uptime: number;       // seconds
  xml: string;
  networkIp: string | null;
  networkMac: string | null;
  hostId: number;
  host?: {
    name: string;
    ip: string;
  };
}

export interface Host {
  id: number;
  name: string;
  ip: string;
  os: string;           // e.g. "Ubuntu 24.04"
  uptime: number;       // seconds
  status: string;       // "up" or "down"
  ssh: boolean;
  cpu: number;          // CPU usage %
  ram: number;          // RAM usage %
  disk: number;         // Disk usage %
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