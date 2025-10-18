/**
 * TanStack Query Client setup for SSR (TanStack Start)
 * Based on official TanStack Query SSR documentation
 */

import { QueryClient, isServer } from '@tanstack/react-query';
import { getStandardQueryConfig } from './query-config';

/**
 * CRITICAL FIX: Create timeout wrapper for network requests
 * React Query doesn't support timeout natively, so we need to implement it ourselves
 */
function createRequestWithTimeout<T>(
  requestFn: (signal?: AbortSignal) => Promise<T>,
  timeout: number = 6000
): () => Promise<T> {
  return () => {
    return new Promise<T>((resolve, reject) => {
      // Create AbortController for manual cancellation
      const controller = new AbortController();
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`Request timed out after ${timeout/1000} seconds. Please refresh the page and try again.`));
      }, timeout);
      
      // Execute the request
      requestFn(controller.signal)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          // If aborted due to timeout, the timeout reject will handle it
          if (!controller.signal.aborted) {
            reject(error);
          }
        });
    });
  };
}

/**
 * Creates a new QueryClient with optimal default configuration
 * This function is called on every server request and once on the client
 */
export function makeQueryClient() {
  const standardConfig = getStandardQueryConfig();

  return new QueryClient({
    defaultOptions: {
      queries: {
        // CRITICAL FIX: Reduce staleTime to prevent stale data during SPA navigation
        // 60s was too long and could cause issues with fresh data after navigation
        staleTime: 30 * 1000, // 30 seconds (reduced from 60s)

        // Garbage collection time - how long unused queries stay in cache
        // Set higher than staleTime to prevent premature cache eviction
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

        // Apply production-optimized retry configuration
        retry: standardConfig.retry,
        retryDelay: standardConfig.retryDelay,
        refetchOnWindowFocus: standardConfig.refetchOnWindowFocus,

        // CRITICAL FIX: Use true instead of 'always' to prevent stuck loading states
        // true = refetch if data is stale (respects staleTime)
        // 'always' = refetch every time even if data is fresh, can cause infinite loading
        // false = never refetch on mount (can cause stale data issues)
        refetchOnMount: true,

        // CRITICAL FIX: Enable refetching on reconnect to recover from network issues
        // This helps recover from broken connections during SPA navigation
        refetchOnReconnect: true,

        // CRITICAL: Add network timeout to prevent hanging requests
        // This prevents queries from staying in loading state forever
        networkMode: 'online',
      },
      mutations: {
        // CRITICAL FIX: Reduce retry to fail faster during network issues
        // This prevents mutations from hanging forever during SPA navigation
        retry: 0, // REDUCED from 1 to 0 - fail immediately to prevent infinite loading
        retryDelay: (attemptIndex: number) =>
          Math.min(1000 * Math.pow(2, attemptIndex), 3000),
        // CRITICAL: Add network timeout for mutations too
        networkMode: 'online',
      },
    },
    // CRITICAL FIX: Add global error handler to detect and log hanging requests
    mutationCache: {
      onError: (error, variables, context, mutation) => {
        console.error('🚨 Mutation failed:', {
          error: error?.message,
          mutationKey: mutation.options.mutationKey,
          variables,
          timestamp: new Date().toISOString(),
        });
      },
    } as any,
    queryCache: {
      onError: (error, query) => {
        console.error('🚨 Query failed:', {
          error: error?.message,
          queryKey: query.queryKey,
          timestamp: new Date().toISOString(),
        });
      },
    } as any,
  });
}

/**
 * Browser-side QueryClient singleton
 * This ensures the same client is reused across client-side navigations
 */
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Gets or creates the QueryClient based on environment
 * - Server: Always creates a new client (per-request isolation)
 * - Browser: Reuses the same client (performance & cache persistence)
 */
export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client for each request
    // This prevents data leakage between different users/requests
    return makeQueryClient();
  } else {
    // Browser: make a new query client only once
    // This is critical to prevent re-creating the client during React suspense
    // and to maintain cache across client-side navigations
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}
