/**
 * Shared TanStack Query configuration optimized for production
 * Provides consistent retry strategies for cold start resilience
 */

// Environment detection for production-specific optimizations
export const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname === 'moneko.io' || window.location.hostname.includes('moneko'));

/**
 * Production-optimized retry configuration for critical queries
 * Higher retry count and faster initial retries for cold start recovery
 */
export const getCriticalQueryConfig = () => ({
  retry: isProduction ? 5 : 3,
  retryDelay: (attemptIndex: number) => {
    // Fast retries for cold start recovery, then exponential backoff
    if (attemptIndex === 0) return 500;  // Quick first retry
    if (attemptIndex === 1) return 1000; // Second retry
    return Math.min(2000 * Math.pow(1.5, attemptIndex - 2), 8000); // Capped exponential
  },
  refetchOnWindowFocus: false, // Prevent unnecessary refetches
});

/**
 * Production-optimized retry configuration for standard queries
 * Balanced retry strategy for non-critical data
 */
export const getStandardQueryConfig = () => ({
  retry: isProduction ? 4 : 3,
  retryDelay: (attemptIndex: number) => {
    // Faster initial retries for cold start recovery
    if (attemptIndex === 0) return 400;  // Quick first retry
    if (attemptIndex === 1) return 900;  // Second retry
    return Math.min(1800 * Math.pow(1.6, attemptIndex - 2), 7000); // Capped exponential
  },
  refetchOnWindowFocus: false,
});

/**
 * Production-optimized retry configuration for Edge Function calls
 * Specifically tuned for serverless cold start patterns
 */
export const getEdgeFunctionQueryConfig = () => ({
  retry: isProduction ? 4 : 3,
  retryDelay: (attemptIndex: number) => {
    // Very fast initial retries for Edge Function cold starts
    if (attemptIndex === 0) return 300;  // Very quick first retry
    if (attemptIndex === 1) return 800;  // Quick second retry
    return Math.min(1500 * Math.pow(1.5, attemptIndex - 2), 6000); // Shorter max delay
  },
  refetchOnWindowFocus: false,
});

/**
 * Lightweight retry configuration for background/optional queries
 * Fewer retries to avoid unnecessary load
 */
export const getBackgroundQueryConfig = () => ({
  retry: isProduction ? 2 : 1,
  retryDelay: (attemptIndex: number) => {
    return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
  },
  refetchOnWindowFocus: false,
});

/**
 * Retry utility for manual operations with cold start awareness
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = isProduction ? 5 : 3,
  initialDelay: number = 500
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      // Faster retries for network/timeout errors (likely cold starts)
      const isNetworkError = error?.message?.includes('fetch') || 
                           error?.message?.includes('timeout') ||
                           error?.message?.includes('network') ||
                           error?.code === 'ECONNRESET';
      
      let delay = initialDelay;
      if (isNetworkError && i < 2) {
        // Quick retries for first two attempts on network errors
        delay = i === 0 ? 300 : 800;
      } else {
        // Exponential backoff for subsequent retries
        delay = Math.min(initialDelay * Math.pow(2, i), 8000);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};