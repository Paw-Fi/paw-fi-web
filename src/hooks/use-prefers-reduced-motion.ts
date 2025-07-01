import React, { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window and matchMedia are available (for SSR compatibility)
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      setPrefersReducedMotion(false); // Default to no reduced motion if not in browser
      return;
    }

    const mediaQueryList = window.matchMedia(QUERY);
    
    // Set initial state
    setPrefersReducedMotion(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener for changes
    // Using addEventListener for modern browsers, with a fallback for older ones
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', listener);
    } else if (mediaQueryList.addListener) { // Deprecated but good for fallback
      mediaQueryList.addListener(listener);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', listener);
      } else if (mediaQueryList.removeListener) { // Deprecated
        mediaQueryList.removeListener(listener);
      }
    };
  }, []);

  return prefersReducedMotion;
}
