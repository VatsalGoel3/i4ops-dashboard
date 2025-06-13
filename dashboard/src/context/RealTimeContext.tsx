// dashboard/src/context/RealTimeContext.tsx

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
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
  const [vms, setVMs] = useState<VM[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 1️⃣ Initial fetch of current data
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [hostRes, vmRes] = await Promise.all([
          axios.get<{ data: Host[] }>('http://localhost:4000/api/hosts'),
          axios.get<{ data: VM[] }>('http://localhost:4000/api/vms'),
        ]);
        setHosts(hostRes.data.data);
        setVMs(vmRes.data.data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Failed initial real-time fetch:', err);
      }
    };
    loadInitial();
  }, []);

  // 2️⃣ Subscribe to SSE for live updates
  useRealTime(
    updatedHosts => {
      setHosts(updatedHosts);
      setLastUpdated(new Date());
    },
    updatedVMs => {
      setVMs(updatedVMs);
      setLastUpdated(new Date());
    },
    singleHost => {
      setHosts(prev => prev.map(h => (h.id === singleHost.id ? singleHost : h)));
      setLastUpdated(new Date());
    },
    singleVM => {
      setVMs(prev => prev.map(v => (v.id === singleVM.id ? singleVM : v)));
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