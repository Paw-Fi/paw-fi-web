/**
 * Performance monitoring utility for SSR optimization tracking
 * Provides metrics for Core Web Vitals and custom performance markers
 */

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  hydrationTime: number | null;
  routeChangeTime: number | null;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    hydrationTime: null,
    routeChangeTime: null,
  };

  private observers: PerformanceObserver[] = [];
  private routeStartTime: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.trackHydration();
    }
  }

  private initializeObservers() {
    // Core Web Vitals observers
    try {
      // First Contentful Paint & Largest Contentful Paint
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const eventEntry = entry as any;
          if (eventEntry.processingStart) {
            this.metrics.fid = eventEntry.processingStart - entry.startTime;
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const layoutEntry = entry as any;
          if (!layoutEntry.hadRecentInput && layoutEntry.value !== undefined) {
            this.metrics.cls = (this.metrics.cls || 0) + layoutEntry.value;
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // Time to First Byte
      const navObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.ttfb = navEntry.responseStart - navEntry.fetchStart;
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

    } catch (error) {
      console.warn('Performance Observer not supported', error);
    }
  }

  private trackHydration() {
    const hydrationStart = performance.now();
    
    // Mark hydration complete when React is ready
    const checkHydration = () => {
      if (document.readyState === 'complete') {
        this.metrics.hydrationTime = performance.now() - hydrationStart;
        this.logMetrics();
      } else {
        setTimeout(checkHydration, 100);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkHydration);
    } else {
      checkHydration();
    }
  }

  public markRouteStart() {
    this.routeStartTime = performance.now();
  }

  public markRouteEnd() {
    if (this.routeStartTime) {
      this.metrics.routeChangeTime = performance.now() - this.routeStartTime;
      this.routeStartTime = null;
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public logMetrics() {
    const metrics = this.getMetrics();
    
    console.group('🚀 Performance Metrics');
    console.log('📊 Core Web Vitals:');
    console.log(`  FCP: ${metrics.fcp ? metrics.fcp.toFixed(2) + 'ms' : 'N/A'} (target: <1800ms)`);
    console.log(`  LCP: ${metrics.lcp ? metrics.lcp.toFixed(2) + 'ms' : 'N/A'} (target: <2500ms)`);
    console.log(`  FID: ${metrics.fid ? metrics.fid.toFixed(2) + 'ms' : 'N/A'} (target: <100ms)`);
    console.log(`  CLS: ${metrics.cls ? metrics.cls.toFixed(3) : 'N/A'} (target: <0.1)`);
    
    console.log('\n⚡ Custom Metrics:');
    console.log(`  TTFB: ${metrics.ttfb ? metrics.ttfb.toFixed(2) + 'ms' : 'N/A'} (target: <800ms)`);
    console.log(`  Hydration: ${metrics.hydrationTime ? metrics.hydrationTime.toFixed(2) + 'ms' : 'N/A'} (target: <1000ms)`);
    console.log(`  Route Change: ${metrics.routeChangeTime ? metrics.routeChangeTime.toFixed(2) + 'ms' : 'N/A'} (target: <200ms)`);
    
    console.log('\n📈 Performance Score:');
    console.log(`  Overall: ${this.calculatePerformanceScore()}/100`);
    console.groupEnd();

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metrics);
    }
  }

  private calculatePerformanceScore(): number {
    const { fcp, lcp, fid, cls, ttfb, hydrationTime } = this.metrics;
    let score = 100;

    // FCP scoring (weight: 20)
    if (fcp) {
      if (fcp > 3000) score -= 20;
      else if (fcp > 1800) score -= 10;
    }

    // LCP scoring (weight: 25)
    if (lcp) {
      if (lcp > 4000) score -= 25;
      else if (lcp > 2500) score -= 15;
    }

    // FID scoring (weight: 15)
    if (fid) {
      if (fid > 300) score -= 15;
      else if (fid > 100) score -= 8;
    }

    // CLS scoring (weight: 15)
    if (cls) {
      if (cls > 0.25) score -= 15;
      else if (cls > 0.1) score -= 8;
    }

    // TTFB scoring (weight: 15)
    if (ttfb) {
      if (ttfb > 1500) score -= 15;
      else if (ttfb > 800) score -= 8;
    }

    // Hydration scoring (weight: 10)
    if (hydrationTime) {
      if (hydrationTime > 2000) score -= 10;
      else if (hydrationTime > 1000) score -= 5;
    }

    return Math.max(0, Math.round(score));
  }

  private sendToAnalytics(metrics: PerformanceMetrics) {
    // Send to Google Analytics or other analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metrics', {
        custom_map: {
          fcp: 'first_contentful_paint',
          lcp: 'largest_contentful_paint',
          fid: 'first_input_delay',
          cls: 'cumulative_layout_shift',
          ttfb: 'time_to_first_byte',
          hydration: 'hydration_time'
        },
        ...metrics
      });
    }
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = typeof window !== 'undefined' ? new PerformanceMonitor() : null;

// Hook for tracking route performance
export function useRoutePerformance() {
  return {
    markStart: () => performanceMonitor?.markRouteStart(),
    markEnd: () => performanceMonitor?.markRouteEnd(),
    getMetrics: () => performanceMonitor?.getMetrics() || null,
    logMetrics: () => performanceMonitor?.logMetrics()
  };
}

// Utility for measuring component render time
export function measureRenderTime<T extends (...args: any[]) => any>(
  fn: T,
  componentName: string
): T {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    if (end - start > 16) { // Only log if render takes >16ms (affects 60fps)
      console.warn(`🐌 Slow render: ${componentName} took ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  }) as T;
}

declare global {
  function gtag(...args: any[]): void;
}