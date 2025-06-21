import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import axios from 'axios';
import type { PaginatedResponse } from '../components/VirtualTable/types';

const API_BASE = 'http://localhost:4000/api';

// Generic cursor-based pagination fetcher
export async function fetchPaginatedData<T>(
  endpoint: string,
  params: {
    cursor?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, any>;
  } = {}
): Promise<PaginatedResponse<T>> {
  const { cursor, limit = 50, sortBy, sortOrder = 'asc', filters = {} } = params;
  
  const searchParams = new URLSearchParams();
  
  if (cursor) searchParams.set('cursor', cursor);
  searchParams.set('limit', limit.toString());
  if (sortBy) searchParams.set('sortBy', sortBy);
  searchParams.set('sortOrder', sortOrder);
  
  // Add filters to query params
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  const url = `${API_BASE}/${endpoint}?${searchParams.toString()}`;
  const { data } = await axios.get<PaginatedResponse<T>>(url);
  
  return data;
}

// Generic infinite query hook
export function useInfinitePagination<T>(
  queryKey: any[],
  endpoint: string,
  options: {
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, any>;
    enabled?: boolean;
  } = {}
) {
  const { limit = 50, sortBy, sortOrder = 'asc', filters = {}, enabled = true } = options;
  
  return useInfiniteQuery({
    queryKey: [...queryKey, { sortBy, sortOrder, filters }],
    queryFn: ({ pageParam }) =>
      fetchPaginatedData<T>(endpoint, {
        cursor: pageParam,
        limit,
        sortBy,
        sortOrder,
        filters,
      }),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    getPreviousPageParam: (firstPage) => firstPage.pagination.prevCursor,
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

// Helper to flatten infinite query data
export function flattenInfiniteData<T>(data: any): T[] {
  return data?.pages?.flatMap((page: any) => page.data) ?? [];
}

// Optimistic update helper for infinite queries
export function updateInfiniteQueryData<T>(
  queryClient: any,
  queryKey: any[],
  updater: (item: T) => T,
  matcher: (item: T) => boolean
) {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    return {
      ...oldData,
      pages: oldData.pages.map((page: any) => ({
        ...page,
        data: page.data.map((item: T) => 
          matcher(item) ? updater(item) : item
        )
      }))
    };
  });
} 