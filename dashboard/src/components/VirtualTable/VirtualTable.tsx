import { useCallback, useMemo, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { ChevronUp, ChevronDown, Loader } from 'lucide-react';
import type { VirtualTableProps, VirtualTableColumn } from './types';

// Memoized row component for performance
const TableRow = memo(({ 
  index, 
  style, 
  data: { items, columns, onRowClick } 
}: any) => {
  const item = items[index];
  
  // Handle loading states for infinite scroll
  if (!item) {
    return (
      <div 
        style={style} 
        className="flex items-center justify-center border-b border-gray-200 dark:border-gray-600"
      >
        <Loader size={16} className="animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`
        flex items-center border-b border-gray-200 dark:border-gray-600 
        hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer
        ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}
      `}
      onClick={() => onRowClick?.(item)}
    >
      {columns.map((column: VirtualTableColumn) => (
        <div
          key={String(column.key)}
          className={`
            px-4 py-2 text-sm truncate
            ${column.align === 'center' ? 'text-center' : 
              column.align === 'right' ? 'text-right' : 'text-left'}
          `}
          style={{ width: column.width, minWidth: column.width }}
        >
          {column.render ? 
            column.render(item[column.key], item) : 
            String(item[column.key] || '-')
          }
        </div>
      ))}
    </div>
  );
});

TableRow.displayName = 'TableRow';

// Header component with sorting
const TableHeader = memo(({ 
  columns, 
  sortConfig, 
  onSort 
}: {
  columns: VirtualTableColumn[];
  sortConfig?: { field: any; direction: 'asc' | 'desc' };
  onSort?: (field: any) => void;
}) => (
  <div className="flex bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
    {columns.map((column) => (
      <div
        key={String(column.key)}
        className={`
          px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200
          ${column.sortable ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600' : ''}
          ${column.align === 'center' ? 'text-center' : 
            column.align === 'right' ? 'text-right' : 'text-left'}
          flex items-center gap-1
        `}
        style={{ width: column.width, minWidth: column.width }}
        onClick={() => column.sortable && onSort?.(column.key)}
      >
        <span className="truncate">{column.title}</span>
        {column.sortable && sortConfig?.field === column.key && (
          sortConfig.direction === 'asc' ? 
            <ChevronUp size={14} /> : 
            <ChevronDown size={14} />
        )}
      </div>
    ))}
  </div>
));

TableHeader.displayName = 'TableHeader';

export default function VirtualTable<T>({
  data,
  columns,
  height,
  itemSize,
  sortConfig,
  onSort,
  onRowClick,
  pagination,
  onLoadMore,
  loading = false,
  className = ''
}: VirtualTableProps<T>) {
  
  // Total item count for infinite loader
  const itemCount = pagination?.hasNextPage ? data.length + 1 : data.length;
  
  // Check if item is loaded (for infinite scroll)
  const isItemLoaded = useCallback((index: number) => {
    return !!data[index];
  }, [data]);
  
  // Load more data when needed
  const loadMoreItems = useCallback(() => {
    if (pagination?.isFetchingNextPage || !pagination?.hasNextPage) {
      return Promise.resolve();
    }
    onLoadMore?.();
    return Promise.resolve();
  }, [pagination?.isFetchingNextPage, pagination?.hasNextPage, onLoadMore]);

  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    items: data,
    columns,
    onRowClick,
    sortConfig
  }), [data, columns, onRowClick, sortConfig]);

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  return (
    <div className={`border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      <TableHeader 
        columns={columns}
        sortConfig={sortConfig}
        onSort={onSort}
      />
      
      <div style={{ height, width: totalWidth }}>
        {pagination ? (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadMoreItems}
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={ref}
                height={height}
                width={totalWidth}
                itemCount={itemCount}
                itemSize={itemSize}
                itemData={itemData}
                onItemsRendered={onItemsRendered}
              >
                {TableRow}
              </List>
            )}
          </InfiniteLoader>
        ) : (
          <List
            height={height}
            width={totalWidth}
            itemCount={data.length}
            itemSize={itemSize}
            itemData={itemData}
          >
            {TableRow}
          </List>
        )}
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-4 bg-gray-50 dark:bg-gray-800">
          <Loader size={16} className="animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading more...</span>
        </div>
      )}
    </div>
  );
} 