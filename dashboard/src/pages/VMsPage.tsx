import { useEffect, useState } from 'react';
import axios from 'axios';
import type { VM, VMFilters } from '../api/types';
import VMFiltersComponent from '../components/Filters/VMFilters';
import VMTable from '../components/VMTable';

export default function VMsPage() {
  const [allVMs, setAllVMs] = useState<VM[]>([]);
  const [displayedVMs, setDisplayedVMs] = useState<VM[]>([]);
  const [hostOptions, setHostOptions] = useState<{ name: string; id: number }[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<VMFilters>({});
  const [sortField, setSortField] = useState<keyof VM>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch all VMs & host list for filters
  useEffect(() => {
    const loadVMs = async () => {
      setLoading(true);
      try {
        // ← **Changed**: point to backend:4000
        const vmRes = await axios.get<VM[]>('http://localhost:4000/api/vms');
        const vms = vmRes.data;
        setAllVMs(vms);

        // Derive host options from the nested vms (hostId and host.name)
        const hostsMap: Record<number, string> = {};
        vms.forEach(vm => {
          if (vm.host) {
            hostsMap[vm.hostId] = vm.host.name;
          }
        });
        setHostOptions(
          Object.entries(hostsMap).map(([id, name]) => ({
            id: Number(id),
            name
          }))
        );

        // Derive status options (e.g., "running", "stopped")
        setStatusOptions(Array.from(new Set(vms.map(vm => vm.status))).sort());
      } catch (err) {
        console.error('Failed to load VMs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadVMs();
  }, []);

  // Compute filtered/sorted/paginated VMs
  useEffect(() => {
    let list = [...allVMs];

    // Apply filters
    if (filters.hostId !== undefined) {
      list = list.filter(vm => vm.hostId === filters.hostId);
    }
    if (filters.status) {
      list = list.filter(vm => vm.status === filters.status);
    }
    if (filters.name) {
      const substr = filters.name.toLowerCase();
      list = list.filter(vm => vm.name.toLowerCase().includes(substr));
    }

    // Sort
    if (sortField) {
      list.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (
          sortField === 'cpu' ||
          sortField === 'ram' ||
          sortField === 'disk' ||
          sortField === 'uptime'
        ) {
          return sortOrder === 'asc'
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
        }
        if (sortField === 'hostId') {
          // Sort by host name if available
          const aName = a.host ? a.host.name : '';
          const bName = b.host ? b.host.name : '';
          return sortOrder === 'asc'
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        }
        return sortOrder === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    setTotal(list.length);
    const startIdx = (page - 1) * pageSize;
    setDisplayedVMs(list.slice(startIdx, startIdx + pageSize));
  }, [allVMs, filters, sortField, sortOrder, page]);

  const handleRefresh = async () => {
    setPage(1);
    setLoading(true);
    try {
      const vmRes = await axios.get<VM[]>('http://localhost:4000/api/vms');
      const vms = vmRes.data;
      setAllVMs(vms);

      const hostsMap: Record<number, string> = {};
      vms.forEach(vm => {
        if (vm.host) {
          hostsMap[vm.hostId] = vm.host.name;
        }
      });
      setHostOptions(
        Object.entries(hostsMap).map(([id, name]) => ({ id: Number(id), name }))
      );
      setStatusOptions(Array.from(new Set(vms.map(vm => vm.status))).sort());
    } catch (err) {
      console.error('Failed to refresh VMs:', err);
    } finally {
      setLoading(false);
    }
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
          onChange={f => {
            setPage(1);
            setFilters(f);
          }}
        />
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <p>Loading VMs…</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            Showing {start}–{end} of {total} VMs
          </p>
          <VMTable
            vms={displayedVMs}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={field => {
              if (field === sortField) {
                setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortField(field);
                setSortOrder('asc');
              }
            }}
          />
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {Math.ceil(total / pageSize)}
            </div>
            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
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