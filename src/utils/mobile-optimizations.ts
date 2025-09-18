/**
 * Mobile optimization utilities for performance improvements
 */
import React from 'react';

// Detect mobile devices more efficiently
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Use viewport width as primary indicator (aligned with existing useDeviceType hook)
  const isMobileWidth = window.innerWidth < 640;
  
  // Additional checks for mobile-specific optimization
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isLowPerformance = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  
  return isMobileWidth || (isTouchDevice && isLowPerformance);
};

// Check if we should skip heavy animations/rendering
export const shouldSkipHeavyRendering = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  const isMobile = isMobileDevice();
  const isSlowConnection = 'connection' in navigator && 
    (navigator as any).connection?.effectiveType === 'slow-2g' ||
    (navigator as any).connection?.effectiveType === '2g';
    
  return isMobile || isSlowConnection;
};

// Lightweight alternative to heavy components
export const MobileFallback: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => {
  if (shouldSkipHeavyRendering()) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

// Performance-optimized component wrapper
export const withMobileOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  MobileComponent?: React.ComponentType<P>
) => {
  return (props: P) => {
    if (shouldSkipHeavyRendering() && MobileComponent) {
      return <MobileComponent {...props} />;
    }
    return <Component {...props} />;
  };
};