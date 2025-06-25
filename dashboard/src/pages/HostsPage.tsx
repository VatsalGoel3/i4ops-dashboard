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

  const { config, getRowClassName,} = useHighlighting();

  const [displayedHosts, setDisplayedHosts] = useState<Host[]>([]);
  const [osOptions, setOsOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [vmCountOptions, setVmCountOptions] = useState<number[]>([]);

  const [filters, setFilters] = useState<HostFilters>({});
  const [sortField, setSortField] = useState<keyof Host>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [total, setTotal] = useState(0);

  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Get virtual table preference from developer settings
  const useVirtualTable = localStorage.getItem('dev_virtual_tables') === 'true';

  // Apply URL-based filters on page load
  useEffect(() => {
    const urlFilters: HostFilters = {};
    
    // Apply auto-filters from URL
    if (config.autoFilters.status) {
      urlFilters.status = config.autoFilters.status;
    }
    if (config.autoFilters.pipelineStage) {
      urlFilters.pipelineStage = config.autoFilters.pipelineStage;
    }
    // Handle SSH filter (convert string to boolean-like filter)
    if (config.autoFilters.ssh === 'false') {
      // We need to extend HostFilters to support SSH filtering
      // For now, we'll handle this in the filtering logic
    }
    
    setFilters(urlFilters);
  }, [config.autoFilters]);

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
    if (config.autoFilters.ssh === 'false') {
      list = list.filter((h) => h.status === 'up' && !h.ssh);
    }
    
    // Handle high-resource highlighting
    if (config.highlightedId === 'high-resource') {
      list = list.filter((h) => h.status === 'up' && (h.cpu > 90 || h.ram > 90 || h.disk > 90));
    }
    
    // Handle search term filtering
    if (config.searchTerm) {
      const searchLower = config.searchTerm.toLowerCase();
      list = list.filter((h) => 
        h.name.toLowerCase().includes(searchLower) ||
        h.ip.toLowerCase().includes(searchLower) ||
        h.os.toLowerCase().includes(searchLower)
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
  }, [allHosts, filters, sortField, sortOrder, page, config]);

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
          
          {/* Context Banner for URL-based navigation */}
          {(config.autoFilters.status || config.autoFilters.pipelineStage || config.searchTerm || config.highlightedId) && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  {config.autoFilters.status && (
                    <span>Showing hosts with status: <strong>{config.autoFilters.status}</strong></span>
                  )}
                  {config.autoFilters.pipelineStage && (
                    <span>Showing hosts in stage: <strong>{config.autoFilters.pipelineStage}</strong></span>
                  )}
                  {config.autoFilters.ssh === 'false' && (
                    <span>Showing hosts <strong>without SSH access</strong></span>
                  )}
                  {config.highlightedId === 'high-resource' && (
                    <span>Showing hosts with <strong>high resource usage</strong> (CPU/RAM/Disk &gt; 90%)</span>
                  )}
                  {config.searchTerm && (
                    <span>Search results for: <strong>"{config.searchTerm}"</strong></span>
                  )}
                </div>
                <button
                  onClick={() => window.location.href = '/hosts'}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <HostFiltersComponent
            filters={filters}
            osOptions={osOptions}
            statusOptions={statusOptions}
            vmCountOptions={vmCountOptions}
            onChange={(f) => {
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
            <p className="text-gray-500 dark:text-gray-400">Loading hosts...</p>
          </div>
        ) : useVirtualTable ? (
          <VirtualHostTable
            filters={filters}
            onRowClick={handleRowClick}
            height={600}
          />
        ) : (
          <>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              Showing {start}–{end} of {total} hosts (Legacy Mode)
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
              onRowClick={handleRowClick}
              getRowClassName={getRowClassName}
            />

            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {Math.ceil(total / pageSize)}
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  disabled={page * pageSize >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {modalVisible && selectedHost && (
        <HostDetailModal
          host={selectedHost}
          onClose={() => setModalVisible(false)}
          onSave={handleHostSave}
        />
      )}

      {localStorage.getItem('dev_performance_monitor') === 'true' && (
        <PerformanceDashboard 
          isVirtual={useVirtualTable}
          itemCount={useVirtualTable ? allHosts.length : displayedHosts.length}
        />
      )}
    </>
  );
}