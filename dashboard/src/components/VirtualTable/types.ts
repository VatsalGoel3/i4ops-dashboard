export interface VirtualTableColumn<T = any> {
  key: keyof T;
  title: string;
  width: number;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface SortConfig<T = any> {
  field: keyof T;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
}

export interface VirtualTableProps<T = any> {
  data: T[];
  columns: VirtualTableColumn<T>[];
  height: number;
  itemSize: number;  // Row height
  sortConfig?: SortConfig<T>;
  onSort?: (field: keyof T) => void;
  onRowClick?: (row: T) => void;
  pagination?: PaginationConfig;
  onLoadMore?: () => void;
  loading?: boolean;
  className?: string;
}

// Cursor-based pagination for infinite scroll
export interface CursorPagination {
  cursor?: string;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor?: string;
    prevCursor?: string;
    hasMore: boolean;
    total?: number;
  };
} 