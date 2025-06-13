import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Host, VM } from '../api/types';
import { useRealTime } from '../api/useRealTime';

interface RealTimeData {
  hosts: Host[];
  vms: VM[];
  lastUpdated: Date | null;
}

const RealTimeContext = createContext<RealTimeData | null>(null);

export function RealTimeProvider({ children }: { children: ReactNode }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [vms, setVMs]     = useState<VM[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useRealTime(
    updatedHosts => {
      setHosts(updatedHosts);
      setLastUpdated(new Date());
    },
    updatedVMs => {
      setVMs(updatedVMs);
      setLastUpdated(new Date());
    },
    host => {
      setHosts(prev => prev.map(h => (h.id === host.id ? host : h)));
      setLastUpdated(new Date());
    },
    vm => {
      setVMs(prev => prev.map(v => (v.id === vm.id ? vm : v)));
      setLastUpdated(new Date());
    }
  );

  return (
    <RealTimeContext.Provider value={{ hosts, vms, lastUpdated }}>
      {children}
    </RealTimeContext.Provider>
  );
}

export function useRealTimeContext() {
  const ctx = useContext(RealTimeContext);
  if (!ctx) throw new Error('useRealTimeContext must be used inside RealTimeProvider');
  return ctx;
}