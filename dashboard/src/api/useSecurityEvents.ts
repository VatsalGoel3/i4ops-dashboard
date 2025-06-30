import { useEffect, useState } from 'react';
import axios from 'axios';
import { config } from '../lib/config';

// Local enums for frontend use (must match backend/prisma)
export enum SecurityEventType {
  egress_attempt = 'egress_attempt',
  file_access = 'file_access',
  authentication_failure = 'authentication_failure',
  suspicious_behavior = 'suspicious_behavior',
  kernel_alert = 'kernel_alert',
  system_alert = 'system_alert',
}

export enum SecurityEventSeverity {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical',
}

export interface SecurityEvent {
  id: number;
  vmName: string;
  hostName: string;
  logType: string;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: string;
  rawLine: string;
  parsedData: any;
  sourceFile: string;
  createdAt: string;
}

export interface SecurityEventFilters {
  vmName?: string;
  hostName?: string;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  logType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface SecurityEventStats {
  total: number;
  byType: Record<SecurityEventType, number>;
  bySeverity: Record<SecurityEventSeverity, number>;
  byVM: Record<string, number>;
  recent: number;
}

export interface SecurityEventsResponse {
  events: SecurityEvent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function useSecurityEvents(filters: SecurityEventFilters = {}) {
  const [data, setData] = useState<SecurityEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });

        const response = await axios.get<SecurityEventsResponse>(
          `${config.api.baseUrl}/security-events?${params.toString()}`
        );
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch security events:', err);
        setError('Failed to load security events');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return { data, loading, error };
}

export function useSecurityEventStats() {
  const [stats, setStats] = useState<SecurityEventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get<SecurityEventStats>(
          `${config.api.baseUrl}/security-events/stats`
        );
        setStats(response.data);
      } catch (err) {
        console.error('Failed to fetch security event stats:', err);
        setError('Failed to load security event statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}

export function useRecentSecurityEvents(limit: number = 10) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get<{ events: SecurityEvent[] }>(
          `${config.api.baseUrl}/security-events/recent?limit=${limit}`
        );
        setEvents(response.data.events);
      } catch (err) {
        console.error('Failed to fetch recent security events:', err);
        setError('Failed to load recent security events');
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, [limit]);

  return { events, loading, error };
}

export function useVMsWithSecurityEvents() {
  const [vms, setVms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVMs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get<{ vms: string[] }>(
          `${config.api.baseUrl}/security-events/vms`
        );
        setVms(response.data.vms);
      } catch (err) {
        console.error('Failed to fetch VMs with security events:', err);
        setError('Failed to load VMs with security events');
      } finally {
        setLoading(false);
      }
    };

    fetchVMs();
  }, []);

  return { vms, loading, error };
} 