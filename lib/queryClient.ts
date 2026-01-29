import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Configured QueryClient with:
 * - Sensible stale/gc times
 * - Retry logic that skips 4xx errors
 * - Global error toasts
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx client errors
        if (error instanceof Error && error.message.includes('4')) {
          const statusMatch = error.message.match(/\b4\d{2}\b/);
          if (statusMatch) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show toast for queries that have already been displayed
      // to avoid showing errors during initial load
      if (query.state.data !== undefined) {
        const message = error instanceof Error ? error.message : 'Une erreur est survenue';
        toast.error(`Erreur de chargement: ${message}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(`Erreur: ${message}`);
    },
  }),
});
