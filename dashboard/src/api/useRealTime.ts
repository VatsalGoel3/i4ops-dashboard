import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queries';
import { useConnection } from '../context/ConnectionContext';
import type { Host, VM, SecurityEvent } from './types';
import { config } from '../lib/config';
import { toast } from 'sonner';

export function useRealTime() {
  const queryClient = useQueryClient();
  const { recordUpdate, setConnected, setDisconnected, setConnecting } = useConnection();

  useEffect(() => {
    setConnecting();
    const es = new EventSource(`${config.api.baseUrl.replace('/api', '')}/api/events`);

    // Connection opened successfully
    es.onopen = () => {
      setConnected();
      recordUpdate(true);
    };

    // Handle hosts update
    es.addEventListener('hosts-update', (e) => {
      try {
        const startTime = Date.now();
        const updatedHosts: Host[] = JSON.parse((e as any).data);
        
        // Update the cache directly with new data
        queryClient.setQueryData(queryKeys.hosts(), updatedHosts);
        
        // Also invalidate to trigger background refetch
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.hosts(),
          exact: true 
        });

        // Record successful update with latency
        const latency = Date.now() - startTime;
        recordUpdate(true, latency);
      } catch (error) {
        console.error('Failed to parse hosts-update SSE data:', error);
        recordUpdate(false);
      }
    });

    // Handle VMs update
    es.addEventListener('vms-update', (e) => {
      try {
        const startTime = Date.now();
        const updatedVMs: VM[] = JSON.parse((e as any).data);
        
        // Update the cache directly with new data
        queryClient.setQueryData(queryKeys.vms(), updatedVMs);
        
        // Also invalidate to trigger background refetch
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.vms(),
          exact: true 
        });

        // Record successful update with latency
        const latency = Date.now() - startTime;
        recordUpdate(true, latency);
      } catch (error) {
        console.error('Failed to parse vms-update SSE data:', error);
        recordUpdate(false);
      }
    });

    // Handle single host update
    es.addEventListener('host-update', (e) => {
      try {
        const updatedHost: Host = JSON.parse((e as any).data);
        
        // Update the specific host in the cache
        queryClient.setQueryData<Host[]>(queryKeys.hosts(), (oldHosts) => {
          if (!oldHosts) return [updatedHost];
          return oldHosts.map(host => 
            host.id === updatedHost.id ? updatedHost : host
          );
        });
      } catch (error) {
        console.error('Failed to parse host-update SSE data:', error);
      }
    });

    // Handle single VM update
    es.addEventListener('vm-update', (e) => {
      try {
        const updatedVM: VM = JSON.parse((e as any).data);
        
        // Update the specific VM in the cache
        queryClient.setQueryData<VM[]>(queryKeys.vms(), (oldVMs) => {
          if (!oldVMs) return [updatedVM];
          return oldVMs.map(vm => 
            vm.id === updatedVM.id ? updatedVM : vm
          );
        });
      } catch (error) {
        console.error('Failed to parse vm-update SSE data:', error);
      }
    });

    // Handle security events
    es.addEventListener('security-event', (e) => {
      try {
        const securityEvent: SecurityEvent = JSON.parse((e as any).data);
        
        // Invalidate security event queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['security-events'] });
        queryClient.invalidateQueries({ queryKey: ['security-event-stats'] });
        queryClient.invalidateQueries({ queryKey: ['critical-security-events'] });
        
        // Show toast notification for critical/high severity events
        if (securityEvent.severity === 'critical' || securityEvent.severity === 'high') {
          const vmName = securityEvent.vm?.machineId || 'Unknown VM';
          const severityIcon = securityEvent.severity === 'critical' ? '🚨' : '⚠️';
          
          toast.error(
            `${severityIcon} Security Alert: ${securityEvent.message}`,
            {
              description: `VM: ${vmName} | Source: ${securityEvent.source}`,
              duration: 10000, // 10 seconds for security alerts
              action: {
                label: 'View Details',
                onClick: () => {
                  // Navigate to security page
                  window.location.hash = '/security';
                }
              }
            }
          );
        }
        
        recordUpdate(true);
      } catch (error) {
        console.error('Failed to parse security-event SSE data:', error);
        recordUpdate(false);
      }
    });

    // Handle connection errors
    es.onerror = (error) => {
      console.warn('SSE connection error:', error);
      setDisconnected('SSE connection failed');
      recordUpdate(false);
    };

    return () => {
      es.close();
    };
  }, [queryClient]);
}