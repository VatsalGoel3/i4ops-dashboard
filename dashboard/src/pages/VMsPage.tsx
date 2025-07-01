import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { VM, VMFilters } from '../api/types';
import VMFiltersComponent from '../components/Filters/VMFilters';
import VMTable from '../components/VMTable';
import VirtualVMTable from '../components/VirtualVMTable';
import PerformanceDashboard from '../components/PerformanceDashboard';

import { useVMs } from '../api/queries';

export default function VMsPage() {
  const { 
    data: allVMs = [], 
    isLoading, 
    refetch,
    isRefetching,
    error 
  } = useVMs();

  const [displayedVMs, setDisplayedVMs] = useState<VM[]>([]);
  const [hostOptions, setHostOptions] = useState<{ name: string; id: number }[]>([]);
  const [statusOptions] = useState<('running' | 'stopped' | 'offline')[]>(['running', 'stopped', 'offline']);
  const [filters, setFilters] = useState<VMFilters>({});
  const [sortField, setSortField] = useState<keyof VM>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [total, setTotal] = useState(0);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(true);
  
  // Toggle for virtual table
  // Get virtual table preference from developer settings
  const useVirtualTable = localStorage.getItem('dev_virtual_tables') === 'true';

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

  const handleRefresh = () => {
    refetch();
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Show error state
  if (error) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-4">
            Failed to load VMs: {(error as any)?.message || 'Unknown error'}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

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
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
            className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 ${
              isLoading || isRefetching
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            title="Refresh data from database"
          >
            <RefreshCw size={16} className={(isLoading || isRefetching) ? 'animate-spin' : ''} />
            {isLoading ? 'Loading...' : isRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Loading VMs...</p>
        </div>
      ) : useVirtualTable ? (
        <VirtualVMTable
          filters={filters}
          onRowClick={() => {}} // VM modal not needed for this demo
          height={600}
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {start}–{end} of {total} VMs (Legacy Mode)
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
        </>
      )}
      
      {localStorage.getItem('dev_performance_monitor') === 'true' && showPerformanceDashboard && (
        <PerformanceDashboard 
          isVirtual={useVirtualTable}
          itemCount={useVirtualTable ? allVMs.length : displayedVMs.length}
          onClose={() => setShowPerformanceDashboard(false)}
        />
      )}
    </section>
  );
}