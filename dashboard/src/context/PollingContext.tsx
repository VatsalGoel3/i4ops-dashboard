import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import type { Host, VM } from '../api/types';

interface PollingData {
  hosts: Host[];
  vms: VM[];
  lastUpdated: Date | null;
  loading: boolean;
  triggerRefresh: () => void;
}

const PollingContext = createContext<PollingData | null>(null);

export function PollingProvider({ children }: { children: ReactNode }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [vms, setVMs] = useState<VM[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hostRes, vmRes] = await Promise.all([
        axios.get<{ data: Host[] }>('http://localhost:4000/api/hosts'),
        axios.get<{ data: VM[] }>('http://localhost:4000/api/vms'),
      ]);
      setHosts(hostRes.data.data);
      setVMs(vmRes.data.data);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Polling failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000); // every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <PollingContext.Provider
      value={{ hosts, vms, lastUpdated, loading, triggerRefresh: fetchData }}
    >
      {children}
    </PollingContext.Provider>
  );
}

export function usePolling() {
  const ctx = useContext(PollingContext);
  if (!ctx) throw new Error('usePolling must be used within PollingProvider');
  return ctx;
}