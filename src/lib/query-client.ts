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
        
        // Apply production-optimized retry configuration
        retry: standardConfig.retry,
        retryDelay: standardConfig.retryDelay,
        refetchOnWindowFocus: standardConfig.refetchOnWindowFocus,
        
        // Prevent refetching on mount if data is fresh
        refetchOnMount: false,
        
        // Prevent refetching on reconnect if data is fresh
        refetchOnReconnect: false,
      },
      mutations: {
        // Apply retry configuration for mutations as well
        retry: 2,
        retryDelay: (attemptIndex: number) => 
          Math.min(1000 * Math.pow(2, attemptIndex), 4000),
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
