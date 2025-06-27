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

    // Handle security events update (batch update)
    es.addEventListener('security-events-update', (e) => {
      try {
        const updateData = JSON.parse((e as any).data);
        
        // Invalidate security event queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['security-events'] });
        queryClient.invalidateQueries({ queryKey: ['security-event-stats'] });
        queryClient.invalidateQueries({ queryKey: ['critical-security-events'] });
        
        recordUpdate(true);
      } catch (error) {
        console.error('Failed to parse security-events-update SSE data:', error);
        recordUpdate(false);
      }
    });

    // Handle individual security events
    es.addEventListener('security-event', (e) => {
      try {
        const securityEvent: SecurityEvent = JSON.parse((e as any).data);
        
        // Invalidate security event queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['security-events'] });
        queryClient.invalidateQueries({ queryKey: ['security-event-stats'] });
        queryClient.invalidateQueries({ queryKey: ['critical-security-events'] });
        
        // Show toast notification for critical/high severity events
        if (securityEvent.severity === 'critical' || securityEvent.severity === 'high') {
          const vmName = securityEvent.vm?.machineId || securityEvent.vm?.name || 'Unknown VM';
          const hostName = securityEvent.vm?.host?.name || 'Unknown Host';
          const severityIcon = securityEvent.severity === 'critical' ? '🚨' : '⚠️';
          
          // Extract meaningful message from the log
          const messageParts = securityEvent.message.split(' | ');
          const logMessage = messageParts.length > 3 ? messageParts[3] : securityEvent.message;
          const shortMessage = logMessage.substring(0, 100) + (logMessage.length > 100 ? '...' : '');
          
          toast.error(
            `${severityIcon} ${securityEvent.severity.toUpperCase()} Security Alert`,
            {
              description: `${shortMessage}\nVM: ${vmName} (${hostName})`,
              duration: 15000, // 15 seconds for security alerts
              action: {
                label: 'View Security',
                onClick: () => {
                  // Navigate to security page
                  window.location.href = '/security';
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