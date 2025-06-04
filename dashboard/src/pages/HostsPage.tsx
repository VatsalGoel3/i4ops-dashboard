import { useEffect, useState } from 'react';
import axios from 'axios';
import type { Host, HostFilters } from '../api/types';
import HostFiltersComponent from '../components/Filters/HostFilters.tsx';
import HostTable from '../components/HostTable';

interface HostEntry {
  name: string;
  ip: string;
  port: number;
}

export default function HostsPage() {
  const [allHosts, setAllHosts] = useState<Host[]>([]);
  const [displayedHosts, setDisplayedHosts] = useState<Host[]>([]);
  const [osOptions, setOsOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [vmCountOptions, setVmCountOptions] = useState<number[]>([]);
  const [filters, setFilters] = useState<HostFilters>({});
  const [sortField, setSortField] = useState<keyof Host>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load hosts on mount
  useEffect(() => {
    const loadHosts = async () => {
      setLoading(true);
      try {
        const { data: hostList } = await axios.get<HostEntry[]>('/hosts.json');
        const results: Host[] = await Promise.all(hostList.map(async (hostInfo: HostEntry) => {
          try {
            const res = await axios.get<Host>(`http://${hostInfo.ip}:${hostInfo.port}/status`);
            const hostData = res.data;
            const host: Host = {
              name: hostInfo.name,
              ip: hostInfo.ip,
              os: hostData.os,
              uptime: typeof hostData.uptime === 'number' ? hostData.uptime : 0,
              status: 'up',
              ssh: hostData.ssh,
              cpu: hostData.cpu,
              ram: hostData.ram,
              disk: hostData.disk,
              vms: hostData.vms || [],
              vm_count: hostData.vms ? hostData.vms.length : 0
            };
            host.vms.forEach(vm => { vm.hostName = host.name; });
            return host;
          } catch {
            return {
              name: hostInfo.name,
              ip: hostInfo.ip,
              os: 'Unknown',
              uptime: 0,
              status: 'down',
              ssh: false,
              cpu: 0,
              ram: 0,
              disk: 0,
              vms: [],
              vm_count: 0
            } as Host;
          }
        }));
        setAllHosts(results);
        setOsOptions(Array.from(new Set(results.map(h => h.os))).sort());
        setStatusOptions(Array.from(new Set(results.map(h => h.status))).sort());
        setVmCountOptions(Array.from(new Set(results.map(h => h.vm_count))).sort((a, b) => a - b));
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Failed to load hosts', err);
      } finally {
        setLoading(false);
      }
    };

    loadHosts();
  }, []);

  // Filtering, sorting, pagination
  useEffect(() => {
    let list = [...allHosts];
    if (filters.os) {
      list = list.filter(h => h.os === filters.os);
    }
    if (filters.status) {
      list = list.filter(h => h.status === filters.status);
    }
    if (filters.vmCount !== undefined) {
      list = list.filter(h => h.vm_count === filters.vmCount);
    }

    list.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (['uptime', 'cpu', 'ram', 'disk', 'vm_count'].includes(sortField)) {
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
      if (sortField === 'ssh') {
        return sortOrder === 'asc'
          ? Number(a.ssh) - Number(b.ssh)
          : Number(b.ssh) - Number(a.ssh);
      }
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    setTotal(list.length);
    const startIndex = (page - 1) * pageSize;
    setDisplayedHosts(list.slice(startIndex, startIndex + pageSize));
  }, [allHosts, filters, sortField, sortOrder, page]);

  const handleRefresh = () => {
    setPage(1);
    setLoading(true);
    axios.get<HostEntry[]>('/hosts.json').then(res => {
      const hostList = res.data;
      Promise.all(hostList.map((hostInfo: HostEntry) =>
        axios.get(`http://${hostInfo.ip}:${hostInfo.port}/status`).then(res => {
          const hostData = res.data;
          const host: Host = {
            name: hostInfo.name,
            ip: hostInfo.ip,
            os: hostData.os,
            uptime: typeof hostData.uptime === 'number' ? hostData.uptime : 0,
            status: 'up',
            ssh: hostData.ssh,
            cpu: hostData.cpu,
            ram: hostData.ram,
            disk: hostData.disk,
            vms: hostData.vms || [],
            vm_count: hostData.vms ? hostData.vms.length : 0
          };
          host.vms.forEach(vm => { vm.hostName = host.name; });
          return host;
        }).catch(() => ({
          name: hostInfo.name,
          ip: hostInfo.ip,
          os: 'Unknown',
          uptime: 0,
          status: 'down',
          ssh: false,
          cpu: 0,
          ram: 0,
          disk: 0,
          vms: [],
          vm_count: 0
        } as Host))
      )).then(results => {
        setAllHosts(results);
        setOsOptions(Array.from(new Set(results.map(h => h.os))).sort());
        setStatusOptions(Array.from(new Set(results.map(h => h.status))).sort());
        setVmCountOptions(Array.from(new Set(results.map(h => h.vm_count))).sort((a, b) => a - b));
        setLastUpdated(new Date());
      }).catch(err => console.error('Failed to refresh hosts', err))
        .finally(() => setLoading(false));
    });
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Hosts</h2>

      <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
        <HostFiltersComponent
          filters={filters}
          osOptions={osOptions}
          statusOptions={statusOptions}
          vmCountOptions={vmCountOptions}
          onChange={(f: HostFilters) => {
            setPage(1);
            setFilters(f);
          }}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded"
          >
            Refresh
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'N/A'}
          </span>
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            Showing {start}–{end} of {total} hosts
          </p>
          <HostTable
            hosts={displayedHosts}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={(field) => {
              if (field === sortField) {
                setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortField(field);
                setSortOrder('asc');
              }
            }}
          />
          <div className="mt-4 flex justify-center lg:justify-between items-center">
            <div className="hidden lg:block text-sm text-gray-600 dark:text-gray-400">
              Page {page}
            </div>
            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}