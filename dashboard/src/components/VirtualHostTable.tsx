import { useMemo, useState, useCallback } from 'react';
import { VirtualTable, type VirtualTableColumn, type SortConfig } from './VirtualTable';
import { useInfinitePagination, flattenInfiniteData } from '../api/pagination';
import { useHosts } from '../api/queries'; // Fallback to existing API
import type { Host, HostFilters } from '../api/types';
import { PipelineStage } from '../api/types';

interface Props {
  filters: HostFilters;
  onRowClick: (host: Host) => void;
  height?: number;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const ROW_HEIGHT = 48; // Consistent row height for virtual scrolling

export default function VirtualHostTable({ 
  filters, 
  onRowClick, 
  height = 600 
}: Props) {
  const [sortConfig, setSortConfig] = useState<SortConfig<Host>>({
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
  } = useInfinitePagination<Host>(
    ['hosts', 'paginated'],
    'hosts/paginated',
    {
      limit: 50,
      sortBy: String(sortConfig.field),
      sortOrder: sortConfig.direction,
      filters: {
        os: filters.os,
        status: filters.status,
        vmCount: filters.vmCount,
      },
    }
  );

  // Fallback to existing hosts API if paginated fails
  const {
    data: fallbackHosts = [],
    isLoading: fallbackLoading,
    error: fallbackError
  } = useHosts();

  // Determine which data source to use
  const useInfinite = !infiniteError && infiniteData;
  const isLoading = useInfinite ? infiniteLoading : fallbackLoading;
  const error = useInfinite ? infiniteError : fallbackError;

  // Process data based on source
  const hosts = useMemo(() => {
    if (useInfinite && infiniteData) {
      return flattenInfiniteData<Host>(infiniteData);
    }
    
    // Fallback: filter and sort existing data locally
    let filtered = [...fallbackHosts];
    
    // Apply filters
    if (filters.os) filtered = filtered.filter(h => h.os === filters.os);
    if (filters.status) filtered = filtered.filter(h => h.status === filters.status);
    if (filters.vmCount !== undefined) {
      filtered = filtered.filter(h => (h.vms?.length ?? 0) === filters.vmCount);
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
  }, [useInfinite, infiniteData, fallbackHosts, filters, sortConfig]);

  // Handle sorting
  const handleSort = useCallback((field: keyof Host) => {
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
  const columns: VirtualTableColumn<Host>[] = useMemo(() => [
    {
      key: 'name',
      title: 'Hostname',
      width: 180,
      sortable: true,
      render: (value: string) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {value}
        </span>
      )
    },
    {
      key: 'ip',
      title: 'IP Address',
      width: 140,
      sortable: true,
      render: (value: string) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
          {value}
        </code>
      )
    },
    {
      key: 'os',
      title: 'OS',
      width: 120,
      sortable: true,
    },
    {
      key: 'uptime',
      title: 'Uptime',
      width: 100,
      sortable: true,
      render: (value: number) => {
        if (!value) return 'N/A';
        const days = Math.floor(value / 86400);
        const hours = Math.floor((value % 86400) / 3600);
        return `${days}d ${hours}h`;
      }
    },
    {
      key: 'status',
      title: 'Status',
      width: 100,
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              value === 'up' ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm">{capitalize(value)}</span>
        </div>
      )
    },
    {
      key: 'cpu',
      title: 'CPU',
      width: 80,
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className={`text-sm ${
          value >= 90 ? 'text-red-600 font-semibold' :
          value >= 70 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {value}%
        </span>
      )
    },
    {
      key: 'ram',
      title: 'RAM',
      width: 80,
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className={`text-sm ${
          value >= 90 ? 'text-red-600 font-semibold' :
          value >= 70 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {value}%
        </span>
      )
    },
    {
      key: 'disk',
      title: 'Disk',
      width: 80,
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className={`text-sm ${
          value >= 90 ? 'text-red-600 font-semibold' :
          value >= 70 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {value}%
        </span>
      )
    },
    {
      key: 'assignedTo',
      title: 'Assigned To',
      width: 120,
      sortable: true,
      render: (value: string) => value ? capitalize(value) : '-'
    },
    {
      key: 'pipelineStage',
      title: 'Stage',
      width: 100,
      sortable: true,
      render: (value: PipelineStage) => (
        <span className={`text-xs px-2 py-1 rounded-full ${
          value === PipelineStage.Active ? 'bg-green-100 text-green-800' :
          value === PipelineStage.Broken ? 'bg-red-100 text-red-800' :
          value === PipelineStage.Installing ? 'bg-blue-100 text-blue-800' :
          value === PipelineStage.Reserved ? 'bg-purple-100 text-purple-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'vms',
      title: 'VMs',
      width: 60,
      sortable: true,
      align: 'right',
      render: (value: any[]) => (
        <span className="text-sm font-medium">
          {value?.length ?? 0}
        </span>
      )
    }
  ], []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">
            {useInfinite ? 'Paginated API not available' : 'Error loading hosts'}
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
            <span>WARNING:</span>
            <span>Using fallback mode - Paginated API endpoints not yet available</span>
          </div>
        </div>
      )}
      
      <VirtualTable
        data={hosts}
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