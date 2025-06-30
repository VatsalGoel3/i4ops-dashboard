import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queries';
import { useConnection } from '../context/ConnectionContext';
import type { Host, VM } from './types';
import { config } from '../lib/config';

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

    // Handle security events update
    es.addEventListener('security-events-update', (e) => {
      try {
        const startTime = Date.now();
        const updateData: { count: number } = JSON.parse((e as any).data);
        
        // Invalidate security events queries to trigger refetch
        queryClient.invalidateQueries({ 
          queryKey: ['security-events']
        });
        queryClient.invalidateQueries({ 
          queryKey: ['security-events-stats']
        });
        queryClient.invalidateQueries({ 
          queryKey: ['security-events-recent']
        });

        // Record successful update with latency
        const latency = Date.now() - startTime;
        recordUpdate(true, latency);
        
        console.log(`Security events updated: ${updateData.count} new events`);
      } catch (error) {
        console.error('Failed to parse security-events-update SSE data:', error);
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