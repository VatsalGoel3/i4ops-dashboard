import { useEffect, useState } from 'react';
import type { VM, VMFilters } from '../api/types';
import VMFiltersComponent from '../components/Filters/VMFilters';
import VMTable from '../components/VMTable';
import { usePolling } from '../context/PollingContext';

export default function VMsPage() {
  const { vms: allVMs, triggerRefresh, loading } = usePolling();

  const [displayedVMs, setDisplayedVMs] = useState<VM[]>([]);
  const [hostOptions, setHostOptions] = useState<{ name: string; id: number }[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<VMFilters>({});
  const [sortField, setSortField] = useState<keyof VM>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);

  // ── Generate dropdown/filter options from VM data ──
  useEffect(() => {
    const hostsMap: Record<number, string> = {};
    allVMs.forEach(vm => {
      if (vm.host) {
        hostsMap[vm.hostId] = vm.host.name;
      }
    });

    setHostOptions(
      Object.entries(hostsMap).map(([id, name]) => ({ id: Number(id), name }))
    );
    setStatusOptions(Array.from(new Set(allVMs.map(vm => vm.status))).sort());
  }, [allVMs]);

  // ── Filtering / Sorting / Pagination ────────
  useEffect(() => {
    let list = [...allVMs];

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

    if (sortField) {
      list.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (sortField === 'cpu' || sortField === 'ram' || sortField === 'disk' || sortField === 'uptime') {
          return sortOrder === 'asc'
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
        }

        if (sortField === 'hostId') {
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
          onClick={triggerRefresh}
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