import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { Host, HostFilters } from '../api/types';
import HostFiltersComponent from '../components/Filters/HostFilters';
import HostTable from '../components/HostTable';
import VirtualHostTable from '../components/VirtualHostTable';
import HostDetailModal from '../components/HostDetailModal';
import PerformanceDashboard from '../components/PerformanceDashboard';
import { useHosts } from '../api/queries';
import { useHighlighting } from '../hooks/useHighlighting';

function compareHostnames(a: string, b: string) {
  const hostRegex = /^([a-zA-Z]+)(\d+)$/;
  const m1 = a.match(hostRegex);
  const m2 = b.match(hostRegex);
  if (m1 && m2 && m1[1] === m2[1]) {
    return Number(m1[2]) - Number(m2[2]);
  }
  return a.localeCompare(b);
}

export default function HostsPage() {
  const { 
    data: allHosts = [], 
    isLoading, 
    refetch,
    isRefetching,
    error 
  } = useHosts();

  const { 
    autoFilters, 
    getRowClassName, 
    getExpiredAssignmentRowClassName,
    searchTerm,
    highlightedId 
  } = useHighlighting();

  const [displayedHosts, setDisplayedHosts] = useState<Host[]>([]);
  const [osOptions, setOsOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [vmCountOptions, setVmCountOptions] = useState<number[]>([]);

  const [filters, setFilters] = useState<HostFilters>({});
  const [sortField, setSortField] = useState<keyof Host>('name');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [total, setTotal] = useState(0);

  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  
  // Get virtual table preference from developer settings
  const useVirtualTable = localStorage.getItem('dev_virtual_tables') === 'true';

  // Apply URL-based filters on page load
  useEffect(() => {
    const urlFilters: HostFilters = {};
    
    // Apply auto-filters from URL
    if (autoFilters.status) {
      urlFilters.status = autoFilters.status;
    }
    if (autoFilters.pipelineStage) {
      urlFilters.pipelineStage = autoFilters.pipelineStage;
    }
    // Handle SSH filter (convert string to boolean-like filter)
    if (autoFilters.ssh === 'false') {
      // We need to extend HostFilters to support SSH filtering
      // For now, we'll handle this in the filtering logic
    }
    
    setFilters(urlFilters);
  }, [autoFilters]);

  useEffect(() => {
    setOsOptions(Array.from(new Set(allHosts.map((h) => h.os))).sort());
    setStatusOptions(Array.from(new Set(allHosts.map((h) => h.status))).sort());
    setVmCountOptions(
      Array.from(new Set(allHosts.map((h) => h.vms?.length ?? 0))).sort((a, b) => a - b)
    );
  }, [allHosts]);

  useEffect(() => {
    let list = [...allHosts];

    if (filters.os) list = list.filter((h) => h.os === filters.os);
    if (filters.status) list = list.filter((h) => h.status === filters.status);
    if (filters.vmCount !== undefined)
      list = list.filter((h) => (h.vms?.length ?? 0) === filters.vmCount);
    
    // Handle special URL filters
    if (autoFilters.ssh === 'false') {
      list = list.filter((h) => h.status === 'up' && !h.ssh);
    }
    
    // Handle expired assignment highlighting
    if (highlightedId === 'expired-assignments') {
      list = list.filter((h) => {
        if (!h.assignedUntil || !h.assignedTo) return false;
        return new Date(h.assignedUntil) < new Date();
      });
    }
    
    // Handle search term filtering
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      list = list.filter((h) => 
        h.name.toLowerCase().includes(searchLower) ||
        h.ip.toLowerCase().includes(searchLower) ||
        h.os.toLowerCase().includes(searchLower) ||
        (h.assignedTo && h.assignedTo.toLowerCase().includes(searchLower))
      );
    }

    list.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (sortField === 'uptime' || sortField === 'cpu' || sortField === 'ram' || sortField === 'disk') {
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }

      if (sortField === 'name') {
        const cmp = compareHostnames(a.name, b.name);
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      if (sortField === 'ssh') {
        return sortOrder === 'asc'
          ? a.ssh === b.ssh
            ? 0
            : a.ssh
            ? 1
            : -1
          : a.ssh === b.ssh
          ? 0
          : a.ssh
          ? -1
          : 1;
      }

      if (sortField === 'vms') {
        const aLen = a.vms?.length ?? 0;
        const bLen = b.vms?.length ?? 0;
        return sortOrder === 'asc' ? aLen - bLen : bLen - aLen;
      }

      if (sortField === 'pipelineStage') {
        return sortOrder === 'asc'
          ? a.pipelineStage.localeCompare(b.pipelineStage)
          : b.pipelineStage.localeCompare(a.pipelineStage);
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    setTotal(list.length);
    const startIdx = (page - 1) * pageSize;
    setDisplayedHosts(list.slice(startIdx, startIdx + pageSize));
  }, [allHosts, filters, sortField, sortOrder, page, autoFilters, highlightedId, searchTerm]);

  const handleRowClick = (host: Host) => {
    setSelectedHost(host);
    setModalVisible(true);
  };

  const handleHostSave = () => {
    setModalVisible(false);
  };

  const handleRefresh = () => {
    refetch();
  };

  // Enhanced row className function that combines regular highlighting with expired assignment highlighting
  const getEnhancedRowClassName = (host: Host, baseClassName: string = '') => {
    let className = baseClassName;
    
    // Apply expired assignment highlighting if active
    if (highlightedId === 'expired-assignments') {
      className = getExpiredAssignmentRowClassName(host, className);
    }
    
    // Apply regular row highlighting
    className = getRowClassName(host.id, className);
    
    return className;
  };

  // Map id to host for getRowClassName prop
  const getRowClassNameForTable = (id: string | number, baseClassName?: string) => {
    const host = displayedHosts.find(h => h.id === id);
    if (!host) return baseClassName || '';
    return getEnhancedRowClassName(host, baseClassName || '');
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Show error state
  if (error) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-4">
            Failed to load hosts: {(error as any)?.message || 'Unknown error'}
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
    <>
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Hosts
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isLoading ? 'Loading...' : `${start}-${end} of ${total} hosts`}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <HostFiltersComponent
            filters={filters}
            osOptions={osOptions}
            statusOptions={statusOptions}
            vmCountOptions={vmCountOptions}
            onChange={setFilters}
          />
          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm flex items-center gap-2"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {useVirtualTable ? (
          <VirtualHostTable
            filters={filters}
            onRowClick={handleRowClick}
            height={600}
          />
        ) : (
          <HostTable
            hosts={displayedHosts}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={setSortField}
            onRowClick={handleRowClick}
            getRowClassName={getRowClassNameForTable}
          />
        )}

        {/* Pagination */}
        {!useVirtualTable && total > pageSize && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {Math.ceil(total / pageSize)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 rounded text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 rounded text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {modalVisible && selectedHost && (
        <HostDetailModal
          host={selectedHost}
          onClose={() => setModalVisible(false)}
          onSave={handleHostSave}
        />
      )}

      {showPerformanceDashboard && (
        <PerformanceDashboard
          isVirtual={useVirtualTable}
          itemCount={displayedHosts.length}
          isVisible={true}
          onClose={() => setShowPerformanceDashboard(false)}
        />
      )}
    </>
  );
}