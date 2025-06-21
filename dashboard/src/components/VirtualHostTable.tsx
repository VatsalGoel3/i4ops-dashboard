import { useMemo, useState, useCallback } from 'react';
import { VirtualTable, type VirtualTableColumn, type SortConfig } from './VirtualTable';
import { useInfinitePagination, flattenInfiniteData } from '../api/pagination';
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

  // Infinite query for hosts with pagination
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error
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

  // Flatten paginated data for virtual table
  const hosts = useMemo(() => flattenInfiniteData<Host>(data), [data]);

  // Handle sorting
  const handleSort = useCallback((field: keyof Host) => {
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
      <div className="flex items-center justify-center h-64 text-red-500">
        <p>Error loading hosts: {error.message}</p>
      </div>
    );
  }

  return (
    <VirtualTable
      data={hosts}
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