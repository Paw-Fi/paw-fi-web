import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';

/**
 * Custom hook for managing scroll position restoration
 * Used to save scroll position before navigation and restore it when coming back
 * 
 * @param storageKey - Unique key for storing scroll position in sessionStorage
 * @param shouldRestore - Whether to restore scroll position on mount (default: true)
 */
export function useScrollRestoration(storageKey: string, shouldRestore: boolean = true) {
  const location = useLocation();
  const isRestoredRef = useRef(false);

  // Restore scroll position on mount (runs before paint)
  useLayoutEffect(() => {
    if (shouldRestore && !isRestoredRef.current) {
      const savedPosition = sessionStorage.getItem(storageKey);
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo({ top: position, left: 0, behavior: 'instant' });
        });
        isRestoredRef.current = true;
      }
    }
  }, [storageKey, shouldRestore]);

  // Save scroll position on scroll
  useEffect(() => {
    if (!shouldRestore) return;

    const handleScroll = () => {
      sessionStorage.setItem(storageKey, window.scrollY.toString());
    };

    // Throttle scroll events for performance
    let timeoutId: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [storageKey, shouldRestore]);

  // Function to save current scroll position
  const saveScrollPosition = () => {
    sessionStorage.setItem(storageKey, window.scrollY.toString());
  };

  // Function to clear saved scroll position
  const clearScrollPosition = () => {
    sessionStorage.removeItem(storageKey);
  };

  return { saveScrollPosition, clearScrollPosition };
}

/**
 * Hook to scroll to top on route change
 * Use this for detail pages that should always start at the top
 */
export function useScrollToTop() {
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);
}
