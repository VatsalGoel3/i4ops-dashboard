import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../lib/config';
import type {
  EnvironmentWithRelations,
  ProjectUserWithRelations,
  ProjectWithRelations,
  UserAccessInfo,
  UserManagementStatistics,
  SearchResult,
  UserFilters,
  ProjectFilters
} from './types';

const API_BASE = config.api.baseUrl;

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  message?: string;
}

interface SearchResponse {
  users: SearchResult[];
  projects: SearchResult[];
  environments: SearchResult[];
}

// API Functions
const userManagementApi = {
  // Environments
  getEnvironments: async (): Promise<EnvironmentWithRelations[]> => {
    const { data } = await axios.get<ApiResponse<EnvironmentWithRelations[]>>(
      `${API_BASE}/user-management/environments`
    );
    return data.data;
  },

  getEnvironment: async (name: string): Promise<EnvironmentWithRelations> => {
    const { data } = await axios.get<ApiResponse<EnvironmentWithRelations>>(
      `${API_BASE}/user-management/environments/${name}`
    );
    return data.data;
  },

  // Users
  getUsers: async (filters: UserFilters = {}): Promise<ProjectUserWithRelations[]> => {
    const params = new URLSearchParams();
    if (filters.environment) params.set('environment', filters.environment);
    if (filters.project) params.set('project', filters.project);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);

    const { data } = await axios.get<ApiResponse<ProjectUserWithRelations[]>>(
      `${API_BASE}/user-management/users?${params.toString()}`
    );
    return data.data;
  },

  getUser: async (id: number): Promise<ProjectUserWithRelations> => {
    const { data } = await axios.get<ApiResponse<ProjectUserWithRelations>>(
      `${API_BASE}/user-management/users/${id}`
    );
    return data.data;
  },

  getUserAccess: async (id: number, environment: string): Promise<UserAccessInfo> => {
    const { data } = await axios.get<ApiResponse<UserAccessInfo>>(
      `${API_BASE}/user-management/users/${id}/access?environment=${environment}`
    );
    return data.data;
  },

  // Projects
  getProjects: async (filters: ProjectFilters = {}): Promise<ProjectWithRelations[]> => {
    const params = new URLSearchParams();
    if (filters.environment) params.set('environment', filters.environment);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);

    const { data } = await axios.get<ApiResponse<ProjectWithRelations[]>>(
      `${API_BASE}/user-management/projects?${params.toString()}`
    );
    return data.data;
  },

  // Statistics
  getStatistics: async (): Promise<UserManagementStatistics> => {
    const { data } = await axios.get<ApiResponse<UserManagementStatistics>>(
      `${API_BASE}/user-management/statistics`
    );
    return data.data;
  },

  // Search
  search: async (query: string, limit: number = 20): Promise<SearchResponse> => {
    const { data } = await axios.get<ApiResponse<SearchResponse>>(
      `${API_BASE}/user-management/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return data.data;
  },
};

// Query Keys
export const userManagementKeys = {
  all: ['user-management'] as const,
  environments: () => [...userManagementKeys.all, 'environments'] as const,
  environment: (name: string) => [...userManagementKeys.environments(), name] as const,
  users: (filters?: UserFilters) => [...userManagementKeys.all, 'users', filters] as const,
  user: (id: number) => [...userManagementKeys.all, 'user', id] as const,
  userAccess: (id: number, environment: string) => 
    [...userManagementKeys.user(id), 'access', environment] as const,
  projects: (filters?: ProjectFilters) => [...userManagementKeys.all, 'projects', filters] as const,
  statistics: () => [...userManagementKeys.all, 'statistics'] as const,
  search: (query: string, limit?: number) => 
    [...userManagementKeys.all, 'search', query, limit] as const,
};

// React Query Hooks
export function useEnvironments() {
  return useQuery({
    queryKey: userManagementKeys.environments(),
    queryFn: userManagementApi.getEnvironments,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEnvironment(name: string, enabled: boolean = true) {
  return useQuery({
    queryKey: userManagementKeys.environment(name),
    queryFn: () => userManagementApi.getEnvironment(name),
    enabled: enabled && !!name,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userManagementKeys.users(filters),
    queryFn: () => userManagementApi.getUsers(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUser(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: userManagementKeys.user(id),
    queryFn: () => userManagementApi.getUser(id),
    enabled: enabled && !!id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUserAccess(id: number, environment: string, enabled: boolean = true) {
  return useQuery({
    queryKey: userManagementKeys.userAccess(id, environment),
    queryFn: () => userManagementApi.getUserAccess(id, environment),
    enabled: enabled && !!id && !!environment,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: userManagementKeys.projects(filters),
    queryFn: () => userManagementApi.getProjects(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUserManagementStatistics() {
  return useQuery({
    queryKey: userManagementKeys.statistics(),
    queryFn: userManagementApi.getStatistics,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUserManagementSearch(query: string, limit: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: userManagementKeys.search(query, limit),
    queryFn: () => userManagementApi.search(query, limit),
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
} 