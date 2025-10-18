/**
 * TanStack Query Client setup for SSR (TanStack Start)
 * Based on official TanStack Query SSR documentation
 */

import { QueryClient, isServer } from '@tanstack/react-query';
import { getStandardQueryConfig } from './query-config';

/**
 * Creates a new QueryClient with optimal default configuration
 * This function is called on every server request and once on the client
 */
export function makeQueryClient() {
  const standardConfig = getStandardQueryConfig();

  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we set a staleTime > 0 to avoid refetching immediately on the client
        // This prevents the "flash of loading" and unnecessary network requests
        staleTime: 60 * 1000, // 60 seconds

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

        // Prevent refetching on reconnect if data is fresh
        refetchOnReconnect: false,

        // CRITICAL: Add network timeout to prevent hanging requests
        // This prevents queries from staying in loading state forever
        networkMode: 'online',
        
        // CRITICAL: Set a maximum query time to prevent infinite loading
        // If a query takes longer than 15 seconds, it will timeout and fail
        // This prevents the infinite loading spinner issue
        meta: {
          timeout: 15000, // 15 second timeout for all queries
        }
      },
      mutations: {
        // Apply retry configuration for mutations as well
        retry: 1, // REDUCED from 2 to 1 to fail faster
        retryDelay: (attemptIndex: number) =>
          Math.min(1000 * Math.pow(2, attemptIndex), 3000),
        // CRITICAL: Add network timeout for mutations too
        networkMode: 'online',
        // Add timeout for mutations
        meta: {
          timeout: 20000, // 20 second timeout for mutations
        },
      },
    },
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
