import { useEffect, useState } from 'react';
import axios from 'axios';
import type { Host, VM, VMFilters } from '../api/types';
import VMFiltersComponent from '../components/Filters/VMFilters';
import VMTable from '../components/VMTable';

interface HostEntry {
  name: string;
  ip: string;
  port: number;
}

export default function VMsPage() {
  const [allVMs, setAllVMs] = useState<VM[]>([]);
  const [displayedVMs, setDisplayedVMs] = useState<VM[]>([]);
  const [hostOptions, setHostOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<VMFilters>({});
  const [sortField, setSortField] = useState<keyof VM>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch all hosts and flatten into VMs list
  useEffect(() => {
    const loadVMs = async () => {
      setLoading(true);
      try {
        const { data: hostList } = await axios.get<HostEntry[]>('/hosts.json');
        let vmsAggregate: VM[] = [];
        await Promise.all(hostList.map(async (hostInfo: HostEntry) => {
          try {
            const res = await axios.get<Host>(`http://${hostInfo.ip}:${hostInfo.port}/status`);
            const hostData = res.data;
            const hostName = hostInfo.name;
            const vms = hostData.vms || [];
            vms.forEach((vm: VM) => {
              vm.hostName = hostName;
            });
            vmsAggregate = vmsAggregate.concat(vms);
          } catch {
            // ignore unreachable host
          }
        }));
        setAllVMs(vmsAggregate);
        setHostOptions(
          Array.from(new Set(vmsAggregate.map(vm => vm.hostName).filter(Boolean) as string[])).sort()
        );
        setStatusOptions(
          Array.from(new Set(vmsAggregate.map(vm => vm.status).filter(Boolean))).sort()
        );
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Failed to load VMs', err);
      } finally {
        setLoading(false);
      }
    };
    loadVMs();
  }, []);

  // Filter, sort, and paginate VMs whenever data or controls change
  useEffect(() => {
    let list = [...allVMs];
    if (filters.host) {
      list = list.filter(vm => vm.hostName === filters.host);
    }
    if (filters.status) {
      list = list.filter(vm => vm.status === filters.status);
    }
    if (filters.name) {
      const substr = filters.name.toLowerCase();
      list = list.filter(vm => vm.name.toLowerCase().includes(substr));
    }

    if (sortField) {
      list.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (['cpu', 'ram', 'disk', 'uptime'].includes(sortField)) {
          return sortOrder === 'asc'
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
        }
        return sortOrder === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    setTotal(list.length);
    const startIndex = (page - 1) * pageSize;
    setDisplayedVMs(list.slice(startIndex, startIndex + pageSize));
  }, [allVMs, filters, sortField, sortOrder, page]);

  const handleRefresh = () => {
    setPage(1);
    setLoading(true);
    axios.get<HostEntry[]>('/hosts.json').then(res => {
      const hostList = res.data;
      let vmsAggregate: VM[] = [];
      Promise.all(
        hostList.map(hostInfo =>
          axios.get<Host>(`http://${hostInfo.ip}:${hostInfo.port}/status`)
            .then(res => {
              const hostData = res.data;
              const vms = hostData.vms || [];
              vms.forEach((vm: VM) => {
                vm.hostName = hostInfo.name;
              });
              vmsAggregate = vmsAggregate.concat(vms);
            })
            .catch(() => {
              // skip down hosts
            })
        )
      ).then(() => {
        setAllVMs(vmsAggregate);
        setHostOptions(
          Array.from(new Set(vmsAggregate.map(vm => vm.hostName).filter(Boolean) as string[])).sort()
        );
        setStatusOptions(
          Array.from(new Set(vmsAggregate.map(vm => vm.status).filter(Boolean))).sort()
        );
        setLastUpdated(new Date());
      }).catch(err => {
        console.error('Failed to refresh VMs', err);
      }).finally(() => {
        setLoading(false);
      });
    });
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">VMs</h2>

      <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
        <VMFiltersComponent
          filters={filters}
          hostOptions={hostOptions}
          statusOptions={statusOptions}
          onChange={(f) => {
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
            Showing {start}–{end} of {total} VMs
          </p>
          <VMTable
            vms={displayedVMs}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={(field) => {
              if (field === sortField) {
                setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
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