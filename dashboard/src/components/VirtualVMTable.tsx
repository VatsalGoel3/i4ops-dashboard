import { useMemo, useState, useCallback } from 'react';
import { VirtualTable, type VirtualTableColumn, type SortConfig } from './VirtualTable';
import { useInfinitePagination, flattenInfiniteData } from '../api/pagination';
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

  // Infinite query for VMs with pagination
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error
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

  // Flatten paginated data for virtual table
  const vms = useMemo(() => flattenInfiniteData<VM>(data), [data]);

  // Handle sorting
  const handleSort = useCallback((field: keyof VM) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Load more data for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
      <div className="flex items-center justify-center h-64 text-red-500">
        <p>Error loading VMs: {error.message}</p>
      </div>
    );
  }

  return (
    <VirtualTable
      data={vms}
      columns={columns}
      height={height}
      itemSize={ROW_HEIGHT}
      sortConfig={sortConfig}
      onSort={handleSort}
      onRowClick={onRowClick}
      pagination={{
        pageSize: 50,
        hasNextPage: hasNextPage ?? false,
        hasPreviousPage: false,
        isLoading,
        isFetchingNextPage
      }}
      onLoadMore={handleLoadMore}
      loading={isLoading}
      className="w-full"
    />
  );
} 