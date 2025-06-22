import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import type { Host, VM } from './types';
import type { AuditLog } from './useAuditLogs';
import { config } from '../lib/config';

const API_BASE = config.api.baseUrl;

// ================================
// QUERY KEYS - Centralized key management
// ================================
export const queryKeys = {
  hosts: () => ['hosts'] as const,
  vms: () => ['vms'] as const,
  auditLogs: (entity: string, entityId: number) => ['audit-logs', entity, entityId] as const,
  pollHistory: () => ['poll-history'] as const,
} as const;

// ================================
// API FUNCTIONS - Pure data fetching
// ================================
const api = {
  hosts: {
    getAll: async (): Promise<Host[]> => {
      const { data } = await axios.get<{ data: Host[] }>(`${API_BASE}/hosts`);
      return data.data;
    },
    update: async (hostId: number, updates: Partial<Host>): Promise<Host> => {
      const { data } = await axios.put<Host>(`${API_BASE}/hosts/${hostId}`, updates);
      return data;
    },
  },
  vms: {
    getAll: async (): Promise<VM[]> => {
      const { data } = await axios.get<{ data: VM[] }>(`${API_BASE}/vms`);
      return data.data;
    },
  },
  auditLogs: {
    getByEntity: async (entity: string, entityId: number): Promise<AuditLog[]> => {
      const { data } = await axios.get<{ data: AuditLog[] }>(
        `${API_BASE}/audit-logs?entity=${entity}&entityId=${entityId}`
      );
      return data.data;
    },
  },
  pollHistory: {
    getAll: async () => {
      const { data } = await axios.get(`${API_BASE}/poll-history`);
      return data;
    },
  },
};

// ================================
// QUERY HOOKS - React hooks for data fetching
// ================================
export const useHosts = () => {
  return useQuery({
    queryKey: queryKeys.hosts(),
    queryFn: api.hosts.getAll,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useVMs = () => {
  return useQuery({
    queryKey: queryKeys.vms(),
    queryFn: api.vms.getAll,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useAuditLogs = (entity: 'Host' | 'VM', entityId: number) => {
  return useQuery({
    queryKey: queryKeys.auditLogs(entity, entityId),
    queryFn: () => api.auditLogs.getByEntity(entity, entityId),
    enabled: !!entityId, // Only run if entityId exists
  });
};

export const usePollHistory = () => {
  return useQuery({
    queryKey: queryKeys.pollHistory(),
    queryFn: api.pollHistory.getAll,
    staleTime: 1 * 60 * 1000, // 1 minute (less frequent updates)
  });
};

// ================================
// MUTATION HOOKS - For data updates with optimistic UI
// ================================
export const useUpdateHost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ hostId, updates }: { hostId: number; updates: Partial<Host> }) => 
      api.hosts.update(hostId, updates),
    
    // Optimistic update - immediately update UI
    onMutate: async ({ hostId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.hosts() });

      // Snapshot the previous value
      const previousHosts = queryClient.getQueryData<Host[]>(queryKeys.hosts());

      // Optimistically update
      if (previousHosts) {
        queryClient.setQueryData<Host[]>(queryKeys.hosts(), (old) => 
          old?.map(host => 
            host.id === hostId ? { ...host, ...updates } : host
          ) || []
        );
      }

      // Return context object with previous value
      return { previousHosts };
    },

    // If mutation fails, rollback
    onError: (err, _variables, context) => {
      if (context?.previousHosts) {
        queryClient.setQueryData(queryKeys.hosts(), context.previousHosts);
      }
      console.error('Failed to update host:', err);
      toast.error('Failed to update host. Please try again.');
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hosts() });
    },

    // Show success message
    onSuccess: (updatedHost) => {
      toast.success(`Host '${updatedHost.name}' updated successfully.`);
    },
  });
}; 