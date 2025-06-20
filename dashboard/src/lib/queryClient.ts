import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data stays fresh before background refetch
      staleTime: 30 * 1000, // 30 seconds
      // How long to keep unused data in cache
      gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (user comes back to tab)
      refetchOnWindowFocus: true,
      // Refetch when network comes back online
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations on network errors
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2; // Less retries for mutations
      },
    },
  },
}); 