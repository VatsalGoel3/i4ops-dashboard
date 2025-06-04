export interface VM {
    name: string;
    status: string;          // e.g. "running" or "stopped"
    cpu: number;             // CPU usage (%) for this VM
    ram: number;             // RAM usage (%) for this VM
    disk: number;            // Disk usage (%) for this VM
    os: string;              // Guest OS of the VM
    uptime: number;          // Uptime in seconds
    xml: string;             // Libvirt-style XML definition
    network: {
      ip: string;
      mac: string;
    };
    hostName?: string;       // added after fetch: name of the host this VM runs on
  }
  
  export interface Host {
    name: string;
    ip: string;
    os: string;
    uptime: number;          // Uptime in seconds
    status: 'up' | 'down';
    ssh: boolean;
    cpu: number;             // CPU usage (%) for host
    ram: number;             // RAM usage (%) for host
    disk: number;            // Disk usage (%) for host
    vm_count: number;
    vms: VM[];
  }
  
  export interface HostFilters {
    os?: string;
    status?: 'up' | 'down';
    vmCount?: number;
  }
  
  export interface VMFilters {
    status?: string;
    host?: string;
    name?: string;
  }  