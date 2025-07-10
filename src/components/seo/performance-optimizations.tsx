import React, { Suspense, lazy } from 'react';

/**
 * Image optimization wrapper component
 * Applies best practices for image loading and rendering
 */
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}> = ({ src, alt, width, height, className }) => {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      style={{
        contentVisibility: 'auto',
      }}
    />
  );
};

/**
 * Lazy load any component with a Suspense fallback
 * @param importFunc - Dynamic import function for the component
 * @param fallback - Optional fallback component, defaults to a minimal loading div
 * @returns Lazily loaded component
 */
export function lazyLoadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <div className="min-h-[100px] animate-pulse bg-gray-200 rounded-md" />
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Streamable content section for SSR performance
 * This allows the main content to be streamed to the client while other parts load
 */
export const StreamableSection: React.FC<{
  children: React.ReactNode;
  priority?: 'high' | 'medium' | 'low';
  className?: string;
}> = ({ children, priority = 'medium', className }) => {
  // This component is mainly to organize content into logical streaming blocks
  // In a real app, you would integrate this with your SSR streaming solution
  return (
    <section 
      className={className} 
      data-priority={priority}
    >
      {children}
    </section>
  );
};

/**
 * Analytics event tracking wrapper
 * Use this to track important user interactions without affecting page performance
 */
export function trackEvent(eventName: string, eventData: Record<string, any>) {
  // Use requestIdleCallback for non-critical tracking to avoid impacting performance
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      // In a real app, send to your analytics service
      console.log('Analytics event:', eventName, eventData);
      
      // Example integration points:
      // - Google Analytics 4
      // - Mixpanel
      // - Amplitude
      // - Custom analytics endpoint
    });
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(() => {
      console.log('Analytics event:', eventName, eventData);
    }, 1);
  }
}

/**
 * A/B test variant selector
 * Lightweight A/B testing utility that doesn't impact initial page load
 */
export function getTestVariant(testName: string, variants: string[]): string {
  // In a production app, you would integrate this with your A/B testing platform
  // This is a simplified version for demonstration
  
  // Deterministic variant selection based on user ID or session
  const userId = 'user-id'; // In real app, get from auth or cookie
  const variantIndex = Math.abs(hashString(`${userId}-${testName}`)) % variants.length;
  
  // Track which variant was shown
  trackEvent('ab_test_impression', {
    test_name: testName,
    variant: variants[variantIndex],
  });
  
  return variants[variantIndex];
}

// Helper function for simple string hashing
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}
