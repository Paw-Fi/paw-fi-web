import { QueryClient } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary'
import { NotFound } from './components/NotFound'
import { performanceMonitor } from './utils/performance-monitor'

// NOTE: Most of the integration code found here is experimental and will
// definitely end up in a more streamlined API in the future. This is just
// to show what's possible with the current APIs.

export function createRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Optimized stale time for SSR performance - balance freshness with speed
        staleTime: 2 * 60 * 1000, // 2 minutes for better caching
        // Balanced refetching - only refetch when data is stale (TanStack default)
        refetchOnMount: true, // Refetch only if data is stale (more balanced than false)
        refetchOnWindowFocus: false, // Reduce network chatter
        refetchOnReconnect: true,
        // Reduce retries for faster failure handling
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors, only network/server errors
          if (error?.status >= 400 && error?.status < 500) return false;
          return failureCount < 2;
        },
        // Longer cache time for better performance
        gcTime: 10 * 60 * 1000, // 10 minutes
        // Enable network mode for better offline handling
        networkMode: 'online',
        // Enable suspense for React 19 concurrent features
        suspense: false, // Keep false for now to maintain compatibility
      },
    },
  })

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    // Aggressive preloading for better SSR performance
    defaultPreload: 'viewport', // Preload when route enters viewport
    defaultPreloadStaleTime: 30 * 1000, // Cache preloaded routes for 30s
    defaultPreloadGcTime: 5 * 60 * 1000, // Keep preloaded data for 5 minutes
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    // Enable scroll restoration for better navigation experience
    scrollRestoration: true,
    // Enable dehydration for SSR performance
    dehydrateRouter: true,
    // Wrap with React 19 concurrent features
    Wrap: ({ children }) => {
      return children;
    },
  })

  // Optimized navigation listener with performance tracking
  router.subscribe('onBeforeLoad', ({ pathChanged, search, cause }) => {
    // Track route performance
    if (pathChanged && cause !== 'preload') {
      performanceMonitor?.markRouteStart();
      
      // Only invalidate stale queries with precise array-based matching
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as (string | undefined)[];
          // Check the first element of the query key array for a precise match
          const primaryKey = queryKey[0];
          const isStale = queryClient.getQueryState(queryKey)?.isStale;
          const isUserSpecific = [
            'courses',
            'lessons', 
            'dashboard',
            'activities',
            'completed-lessons', // Add other specific query keys
            'user-profile',
            'conversations'
          ].includes(primaryKey ?? '');
          
          // Only invalidate if the query is stale AND user-specific
          return isUserSpecific && (isStale || query.state.status === 'error');
        },
        // Use refetchType 'active' to avoid refetching inactive queries
        refetchType: 'active',
      });
    }
  });
  
  // Add route preloading optimization with performance tracking
  router.subscribe('onLoad', ({ pathChanged }) => {
    if (pathChanged) {
      // Mark route load complete for performance tracking
      performanceMonitor?.markRouteEnd();
      
      // Preload critical routes after navigation
      const currentPath = router.state.location.pathname;
      if (currentPath === '/dashboard') {
        // Preload commonly accessed dashboard routes
        router.preloadRoute({ to: '/dashboard/learning' });
        router.preloadRoute({ to: '/dashboard/calculators' });
      } else if (currentPath === '/dashboard/learning') {
        // Preload course detail pages
        router.preloadRoute({ to: '/dashboard/learning/$courseId', params: { courseId: 'essentials' } });
      }
    }
  });

  return routerWithQueryClient(router, queryClient)
}

// Enhanced type safety for router
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
  
  // Add streaming SSR types
  interface RouterContext {
    queryClient: QueryClient;
  }
}
