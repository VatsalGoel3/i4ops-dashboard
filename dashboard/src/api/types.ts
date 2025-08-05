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
  assignedAt?: string | null;    // ISO string when assignment was made
  assignedUntil?: string | null; // ISO string when assignment expires
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

// User Management Types
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type ProjectStatus = 'active' | 'inactive' | 'archived';

export interface Environment {
  id: number;
  name: string;
  displayName: string;
  hostname: string | null;
  ip: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  projectId: string | null;
  bizId: string | null;
  status: ProjectStatus;
  environmentId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUser {
  id: number;
  username: string;
  name: string;
  email: string;
  status: UserStatus;
  vncDisplay: number | null;
  vncPort: number | null;
  webPort: number | null;
  homeDirectory: string | null;
  environmentId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectManager {
  id: number;
  username: string;
  name: string;
  email: string;
  projectId: number;
  managerId: string | null;
  passwordHash: string | null;
  status: UserStatus;
  environmentId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PathWhitelist {
  id: number;
  name: string;
  sources: string[];
  targetHost: string | null;
  targetPath: string | null;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserServiceStatus {
  id: number;
  userId: number;
  service: string;
  status: string;
  lastCheck: string;
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
}

// Extended types with relations
export interface ProjectUserWithRelations extends ProjectUser {
  environment: Environment;
  projects: Project[];
  serviceStatus: UserServiceStatus[];
}

export interface ProjectWithRelations extends Project {
  environment: Environment;
  users: ProjectUser[];
  managers: ProjectManager[];
  pathWhitelists: PathWhitelist[];
}

export interface EnvironmentWithRelations extends Environment {
  projects: Project[];
  users: ProjectUser[];
}

export interface UserAccessInfo {
  username: string;
  tailscaleUrl: string | null;
  tailscaleIpUrl: string | null;
  vncPort: number | null;
  webPort: number | null;
  status: string;
  lastCheck: string | null;
}

export interface UserFilters {
  environment?: string;
  project?: string;
  status?: UserStatus;
  search?: string;
}

export interface ProjectFilters {
  environment?: string;
  status?: ProjectStatus;
  search?: string;
}

export interface UserManagementStatistics {
  totals: {
    environments: number;
    projects: number;
    users: number;
    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
  };
  usersPerEnvironment: Array<{
    environment: string;
    displayName: string;
    userCount: number;
    projectCount: number;
  }>;
}

export interface SearchResult {
  type: 'user' | 'project' | 'environment';
  id: number;
  title: string;
  subtitle: string;
  data: any;
}