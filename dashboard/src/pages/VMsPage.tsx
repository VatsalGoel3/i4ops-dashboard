import { useEffect, useState } from 'react';
import type { VM, VMFilters } from '../api/types';
import VMFiltersComponent from '../components/Filters/VMFilters';
import VMTable from '../components/VMTable';
import { useDataContext } from '../context/DataContext';

export default function VMsPage() {
  const { vms: allVMs } = useDataContext();

  const [displayedVMs, setDisplayedVMs] = useState<VM[]>([]);
  const [hostOptions, setHostOptions] = useState<{ name: string; id: number }[]>([]);
  const [statusOptions] = useState<('up' | 'down')[]>(['up', 'down']);
  const [filters, setFilters] = useState<VMFilters>({});
  const [sortField, setSortField] = useState<keyof VM>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [total, setTotal] = useState(0);

  // Generate host options from VM data
  useEffect(() => {
    const hostsMap: Record<number, string> = {};
    allVMs.forEach(vm => {
      if (vm.host) {
        hostsMap[vm.hostId] = vm.host.name;
      }
    });

    setHostOptions(
      Object.entries(hostsMap).map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, [allVMs]);

  // Filtering / Sorting / Pagination
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

    // Apply sorting
    if (sortField) {
      list.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        // Handle numeric fields
        if (sortField === 'cpu' || sortField === 'ram' || sortField === 'disk' || sortField === 'uptime') {
          const numA = Number(aVal) || 0;
          const numB = Number(bVal) || 0;
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }

        // Handle host sorting by name
        if (sortField === 'hostId') {
          const aName = a.host?.name || '';
          const bName = b.host?.name || '';
          return sortOrder === 'asc'
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        }

        // Handle string fields
        const strA = String(aVal || '');
        const strB = String(bVal || '');
        return sortOrder === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
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
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Virtual Machines
      </h2>
      
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
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Real-time updates enabled
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {start}–{end} of {total} VMs
      </p>
      
      <div className="overflow-x-auto">
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
      </div>
      
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
            Previous
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
    </section>
  );
}