import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import type { Host, VM, SecurityEvent, SecurityEventStats, SecurityEventFilters } from './types';
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
  securityEvents: (filters?: SecurityEventFilters) => ['security-events', filters] as const,
  securityEventStats: (since?: string) => ['security-event-stats', since] as const,
  criticalSecurityEvents: () => ['critical-security-events'] as const,
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
  securityEvents: {
    getAll: async (filters: SecurityEventFilters = {}, page: number = 1, limit: number = 50): Promise<{ data: SecurityEvent[]; total: number }> => {
      const params = new URLSearchParams();
      if (filters.vmId) params.set('vmId', filters.vmId.toString());
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.rule) params.set('rule', filters.rule);
      if (filters.since) params.set('since', filters.since);
      if (filters.until) params.set('until', filters.until);
      if (filters.acknowledged !== undefined) params.set('acknowledged', filters.acknowledged.toString());
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const { data } = await axios.get<{ data: SecurityEvent[]; total: number }>(
        `${API_BASE}/security-events?${params.toString()}`
      );
      return data;
    },
    getStats: async (since?: string): Promise<SecurityEventStats> => {
      const params = since ? `?since=${since}` : '';
      const { data } = await axios.get<SecurityEventStats>(`${API_BASE}/security-events/stats${params}`);
      return data;
    },
    getCritical: async (limit: number = 10): Promise<SecurityEvent[]> => {
      const { data } = await axios.get<SecurityEvent[]>(`${API_BASE}/security-events/critical?limit=${limit}`);
      return data;
    },
    acknowledge: async (id: number): Promise<SecurityEvent> => {
      const { data } = await axios.put<SecurityEvent>(`${API_BASE}/security-events/${id}/acknowledge`);
      return data;
    },
    acknowledgeMultiple: async (ids: number[]): Promise<{ acknowledged: number }> => {
      const { data } = await axios.put<{ acknowledged: number }>(`${API_BASE}/security-events/acknowledge`, { ids });
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

export const useSecurityEvents = (filters: SecurityEventFilters = {}, page: number = 1, limit: number = 50) => {
  return useQuery({
    queryKey: queryKeys.securityEvents(filters),
    queryFn: () => api.securityEvents.getAll(filters, page, limit),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSecurityEventStats = (since?: string) => {
  return useQuery({
    queryKey: queryKeys.securityEventStats(since),
    queryFn: () => api.securityEvents.getStats(since),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useCriticalSecurityEvents = (limit: number = 10) => {
  return useQuery({
    queryKey: queryKeys.criticalSecurityEvents(),
    queryFn: () => api.securityEvents.getCritical(limit),
    staleTime: 15 * 1000, // 15 seconds for critical events
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
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

export const useAcknowledgeSecurityEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.securityEvents.acknowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-events'] });
      queryClient.invalidateQueries({ queryKey: ['security-event-stats'] });
      queryClient.invalidateQueries({ queryKey: ['critical-security-events'] });
      toast.success('Security event acknowledged.');
    },
    onError: (error) => {
      console.error('Failed to acknowledge security event:', error);
      toast.error('Failed to acknowledge security event.');
    },
  });
};

export const useAcknowledgeMultipleSecurityEvents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.securityEvents.acknowledgeMultiple,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['security-events'] });
      queryClient.invalidateQueries({ queryKey: ['security-event-stats'] });
      queryClient.invalidateQueries({ queryKey: ['critical-security-events'] });
      toast.success(`${result.acknowledged} security events acknowledged.`);
    },
    onError: (error) => {
      console.error('Failed to acknowledge security events:', error);
      toast.error('Failed to acknowledge security events.');
    },
  });
}; 