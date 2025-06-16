import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import type { Host, VM } from '../api/types';
import { useRealTime } from '../api/useRealTime';

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
      console.error('Data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useRealTime(
    (updatedHosts) => {
      setHosts(updatedHosts);
      setLastUpdated(new Date());
    },
    (updatedVMs) => {
      setVMs(updatedVMs);
      setLastUpdated(new Date());
    },
    (singleHost) => {
      setHosts((prev) =>
        prev.map((h) => (h.id === singleHost.id ? singleHost : h))
      );
      setLastUpdated(new Date());
    },
    (singleVM) => {
      setVMs((prev) =>
        prev.map((v) => (v.id === singleVM.id ? singleVM : v))
      );
      setLastUpdated(new Date());
    }
  );

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