import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queries';
import type { Host, VM } from './types';

export function useRealTime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource('http://localhost:4000/api/events');

    // Handle hosts update
    es.addEventListener('hosts-update', (e) => {
      try {
        const updatedHosts: Host[] = JSON.parse((e as any).data);
        
        // Update the cache directly with new data
        queryClient.setQueryData(queryKeys.hosts(), updatedHosts);
        
        // Also invalidate to trigger background refetch
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.hosts(),
          exact: true 
        });
      } catch (error) {
        console.error('Failed to parse hosts-update SSE data:', error);
      }
    });

    // Handle VMs update
    es.addEventListener('vms-update', (e) => {
      try {
        const updatedVMs: VM[] = JSON.parse((e as any).data);
        
        // Update the cache directly with new data
        queryClient.setQueryData(queryKeys.vms(), updatedVMs);
        
        // Also invalidate to trigger background refetch
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.vms(),
          exact: true 
        });
      } catch (error) {
        console.error('Failed to parse vms-update SSE data:', error);
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
      // TanStack Query will handle refetching when connection is restored
    };

    return () => {
      es.close();
    };
  }, [queryClient]);
}