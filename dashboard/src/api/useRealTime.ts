import { useEffect } from 'react';
import type { Host, VM } from './types';

type EventCallback<T> = (data: T) => void;

export function useRealTime(
  onHostsUpdate?: EventCallback<Host[]>,
  onVMsUpdate?: EventCallback<VM[]>,
  onHostUpdate?: EventCallback<Host>,
  onVMUpdate?: EventCallback<VM>
) {
  useEffect(() => {
    const es = new EventSource('http://localhost:4000/api/events');

    if (onHostsUpdate) {
      es.addEventListener('hosts-update', e => {
        onHostsUpdate(JSON.parse((e as any).data));
      });
    }
    if (onVMsUpdate) {
      es.addEventListener('vms-update', e => {
        onVMsUpdate(JSON.parse((e as any).data));
      });
    }
    if (onHostUpdate) {
      es.addEventListener('host-update', e => {
        onHostUpdate(JSON.parse((e as any).data));
      });
    }
    if (onVMUpdate) {
      es.addEventListener('vm-update', e => {
        onVMUpdate(JSON.parse((e as any).data));
      });
    }

    return () => {
      es.close();
    };
  }, [onHostsUpdate, onVMsUpdate, onHostUpdate, onVMUpdate]);
}