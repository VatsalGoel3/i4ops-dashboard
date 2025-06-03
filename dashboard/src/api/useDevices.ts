import { useState, useEffect } from 'react';
import axios from 'axios';

export interface Device {
  id: number;
  dev_name: string;
  factory: string;
  ip_address: string;
  mac_address: string;
  dev_status: 'up' | 'down';
  dev_fw: string;
  first_service: string;
  second_service: string;
  third_service: string;
  last_seen: string;
}

export interface DeviceFilters {
  factory?: string;
  status?: 'up' | 'down';
}

export function useDevices(
  page: number,
  pageSize: number,
  filters: DeviceFilters = {},
  sortField?: keyof Device,
  sortOrder: 'asc' | 'desc' = 'asc'
) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get<Device[]>('/mock-devices.json').then(res => {
      let list = res.data;

      if (filters.factory) list = list.filter(d => d.factory === filters.factory);
      if (filters.status) list = list.filter(d => d.dev_status === filters.status);

      if (sortField) {
        list = [...list].sort((a, b) => {
          const va = a[sortField], vb = b[sortField];
          if (sortField === 'last_seen') {
            return sortOrder === 'asc'
              ? new Date(va).getTime() - new Date(vb).getTime()
              : new Date(vb).getTime() - new Date(va).getTime();
          }
          return sortOrder === 'asc'
            ? String(va).localeCompare(String(vb))
            : String(vb).localeCompare(String(va));
        });
      }

      setTotal(list.length);
      const start = (page - 1) * pageSize;
      setDevices(list.slice(start, start + pageSize));
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [page, pageSize, filters.factory, filters.status, sortField, sortOrder]);

  return { devices, total, loading };
}