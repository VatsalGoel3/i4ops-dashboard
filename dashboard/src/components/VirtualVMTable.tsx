import { useMemo, useState, useCallback } from 'react';
import { VirtualTable, type VirtualTableColumn, type SortConfig } from './VirtualTable';
import { useInfinitePagination, flattenInfiniteData } from '../api/pagination';
import { useVMs } from '../api/queries'; // Fallback to existing API
import type { VM, VMFilters } from '../api/types';

interface Props {
  filters: VMFilters;
  onRowClick: (vm: VM) => void;
  height?: number;
}

const ROW_HEIGHT = 48;

const formatUptime = (seconds?: number) => {
  if (!seconds || isNaN(seconds)) return 'N/A';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
};

const getResourceColor = (val?: number) => {
  if (val === undefined || val === null) return 'text-gray-400';
  if (val >= 90) return 'text-red-600 font-semibold';
  if (val >= 70) return 'text-yellow-600';
  return 'text-green-600';
};

export default function VirtualVMTable({ 
  filters, 
  onRowClick, 
  height = 600 
}: Props) {
  const [sortConfig, setSortConfig] = useState<SortConfig<VM>>({
    field: 'name',
    direction: 'asc'
  });

  // Try infinite pagination first, fall back to existing API
  const {
    data: infiniteData,
    isLoading: infiniteLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: infiniteError
  } = useInfinitePagination<VM>(
    ['vms', 'paginated'],
    'vms/paginated',
    {
      limit: 50,
      sortBy: String(sortConfig.field),
      sortOrder: sortConfig.direction,
      filters: {
        status: filters.status,
        hostId: filters.hostId,
        name: filters.name,
      },
    }
  );

  // Fallback to existing VMs API if paginated fails
  const {
    data: fallbackVMs = [],
    isLoading: fallbackLoading,
    error: fallbackError
  } = useVMs();

  // Determine which data source to use
  const useInfinite = !infiniteError && infiniteData;
  const isLoading = useInfinite ? infiniteLoading : fallbackLoading;
  const error = useInfinite ? infiniteError : fallbackError;

  // Process data based on source
  const vms = useMemo(() => {
    if (useInfinite && infiniteData) {
      return flattenInfiniteData<VM>(infiniteData);
    }
    
    // Fallback: filter and sort existing data locally
    let filtered = [...fallbackVMs];
    
    // Apply filters
    if (filters.hostId !== undefined) {
      filtered = filtered.filter(vm => vm.hostId === filters.hostId);
    }
    if (filters.status) {
      filtered = filtered.filter(vm => vm.status === filters.status);
    }
    if (filters.name) {
      const searchTerm = filters.name.toLowerCase();
      filtered = filtered.filter(vm => vm.name.toLowerCase().includes(searchTerm));
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.field];
      const bVal = b[sortConfig.field];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      const comparison = aStr.localeCompare(bStr);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [useInfinite, infiniteData, fallbackVMs, filters, sortConfig]);

  // Handle sorting
  const handleSort = useCallback((field: keyof VM) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Load more data for infinite scroll (only works with paginated API)
  const handleLoadMore = useCallback(() => {
    if (useInfinite && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [useInfinite, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Column definitions optimized for virtual scrolling
  const columns: VirtualTableColumn<VM>[] = useMemo(() => [
    {
      key: 'name',
      title: 'VM Name',
      width: 180,
      sortable: true,
      render: (value: string) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {value}
        </span>
      )
    },
    {
      key: 'machineId',
      title: 'Machine ID',
      width: 160,
      sortable: true,
      render: (value: string) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded font-mono">
          {value}
        </code>
      )
    },
    {
      key: 'host',
      title: 'Host',
      width: 140,
      sortable: false,
      render: (value: any) => (
        <div className="text-sm">
          <div className="font-medium">{value?.name || 'N/A'}</div>
          {value?.ip && (
            <div className="text-xs text-gray-500">
              <code>{value.ip}</code>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'ip',
      title: 'VM IP',
      width: 120,
      sortable: true,
      render: (value: string) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
          {value}
        </code>
      )
    },
    {
      key: 'status',
      title: 'Status',
      width: 90,
      sortable: true,
      render: (value: string) => (
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full ${
            value === 'up'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {value.toUpperCase()}
        </span>
      )
    },
    {
      key: 'cpu',
      title: 'CPU%',
      width: 80,
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className={`text-sm ${getResourceColor(value)}`}>
          {value != null ? `${value.toFixed(1)}%` : '—'}
        </span>
      )
    },
    {
      key: 'ram',
      title: 'RAM%',
      width: 80,
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className={`text-sm ${getResourceColor(value)}`}>
          {value != null ? `${value.toFixed(1)}%` : '—'}
        </span>
      )
    },
    {
      key: 'disk',
      title: 'Disk%',
      width: 80,
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className={`text-sm ${getResourceColor(value)}`}>
          {value != null ? `${value.toFixed(1)}%` : '—'}
        </span>
      )
    },
    {
      key: 'os',
      title: 'OS',
      width: 100,
      sortable: true,
      render: (value: string) => value || '-'
    },
    {
      key: 'uptime',
      title: 'Uptime',
      width: 100,
      sortable: true,
      render: (value: number) => formatUptime(value)
    }
  ], []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">
            {useInfinite ? 'Paginated API not available' : 'Error loading VMs'}
          </p>
          <p className="text-sm text-gray-500">
            {useInfinite ? 'Using existing data source as fallback' : 'Please try refreshing'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Backend Status Indicator */}
      {!useInfinite && (
        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
            <span>⚠️</span>
            <span>Using fallback mode - Paginated API endpoints not yet available</span>
          </div>
        </div>
      )}
      
      <VirtualTable
        data={vms}
        columns={columns}
        height={height}
        itemSize={ROW_HEIGHT}
        sortConfig={sortConfig}
        onSort={handleSort}
        onRowClick={onRowClick}
        pagination={useInfinite ? {
          pageSize: 50,
          hasNextPage: hasNextPage ?? false,
          hasPreviousPage: false,
          isLoading,
          isFetchingNextPage
        } : undefined}
        onLoadMore={useInfinite ? handleLoadMore : undefined}
        loading={isLoading}
        className="w-full"
      />
    </div>
  );
} 