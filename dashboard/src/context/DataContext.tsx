import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import type { Host, VM } from '../api/types';
import { config } from '../lib/config';

interface DataContextType {
  hosts: Host[];
  vms: VM[];
  lastUpdated: Date | null;
  loading: boolean;
  triggerRefresh: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [vms, setVMs] = useState<VM[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hostRes, vmRes] = await Promise.all([
        axios.get<{ data: Host[] }>(`${config.api.baseUrl}/hosts`),
        axios.get<{ data: VM[] }>(`${config.api.baseUrl}/vms`),
      ]);
      setHosts(hostRes.data.data);
      setVMs(vmRes.data.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Note: Real-time updates are now handled by TanStack Query + SSE
  // This context is kept for backward compatibility but will be removed

  return (
    <DataContext.Provider value={{ hosts, vms, lastUpdated, loading, triggerRefresh: fetchData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataContext must be used within DataProvider');
  return ctx;
}