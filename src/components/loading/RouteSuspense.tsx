import { Suspense, type ReactNode } from 'react'
import { useRoutePerformance } from '@/utils/performance-monitor'

interface RouteSuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
  routeName?: string;
}

/**
 * Enhanced Suspense wrapper for route-level code splitting
 * Tracks loading performance and provides optimized fallbacks
 */
export function RouteSuspense({ 
  children, 
  fallback, 
  routeName = 'unknown' 
}: RouteSuspenseProps) {
  const { markStart, markEnd } = useRoutePerformance();

  const defaultFallback = (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <Suspense 
      fallback={fallback || defaultFallback}
      // Enhanced suspense with performance tracking
    >
      <div 
        onLoad={() => markEnd()}
        data-route={routeName}
      >
        {children}
      </div>
    </Suspense>
  );
}

/**
 * Lightweight loading skeleton for dashboard components
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-12 bg-muted/20 rounded-3xl w-64 mb-4 animate-pulse" />
          <div className="h-6 bg-muted/20 rounded-xl w-96 animate-pulse" />
        </div>
        
        {/* Metrics grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-background rounded-3xl p-8">
              <div className="w-12 h-12 bg-muted/20 rounded-2xl mb-4 animate-pulse" />
              <div className="h-6 bg-muted/20 rounded-xl w-24 mb-2 animate-pulse" />
              <div className="h-8 bg-muted/20 rounded-xl w-32 animate-pulse" />
            </div>
          ))}
        </div>
        
        {/* Content sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-background rounded-3xl p-8">
            <div className="h-6 bg-muted/20 rounded-xl w-48 mb-6 animate-pulse" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted/20 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
          <div className="bg-background rounded-3xl p-8">
            <div className="h-6 bg-muted/20 rounded-xl w-40 mb-6 animate-pulse" />
            <div className="h-64 bg-muted/20 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Lightweight loading skeleton for learning components
 */
export function LearningSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-12 bg-muted/20 rounded-3xl w-80 mb-4 animate-pulse" />
          <div className="h-6 bg-muted/20 rounded-xl w-96 animate-pulse" />
        </div>
        
        {/* Course grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-background rounded-3xl p-8">
              <div className="w-16 h-16 bg-muted/20 rounded-3xl mb-6 animate-pulse" />
              <div className="h-6 bg-muted/20 rounded-xl w-full mb-3 animate-pulse" />
              <div className="h-4 bg-muted/20 rounded-lg w-3/4 mb-4 animate-pulse" />
              <div className="flex items-center justify-between">
                <div className="h-4 bg-muted/20 rounded-lg w-20 animate-pulse" />
                <div className="h-8 bg-muted/20 rounded-xl w-24 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Lightweight loading skeleton for calculator components
 */
export function CalculatorSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="text-center mb-8">
          <div className="h-12 bg-muted/20 rounded-3xl w-80 mx-auto mb-4 animate-pulse" />
          <div className="h-6 bg-muted/20 rounded-xl w-96 mx-auto animate-pulse" />
        </div>
        
        {/* Calculator grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-background rounded-3xl p-8 text-center">
              <div className="w-16 h-16 bg-muted/20 rounded-3xl mx-auto mb-6 animate-pulse" />
              <div className="h-6 bg-muted/20 rounded-xl w-full mb-3 animate-pulse" />
              <div className="h-4 bg-muted/20 rounded-lg w-3/4 mx-auto mb-6 animate-pulse" />
              <div className="h-10 bg-muted/20 rounded-2xl w-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}