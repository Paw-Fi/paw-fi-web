'use client';

import { useEffect } from 'react';

/**
 * Hook that locks/unlocks the body scroll when the modal is open
 * @param {boolean} lock - Whether to lock the body scroll
 */
export function useLockBodyScroll(lock: boolean): void {
  useEffect(() => {
    // Get the current scroll position
    const scrollY = window.scrollY;
    
    // Add or remove the 'overflow-hidden' class based on the lock state
    if (lock) {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    }
    
    // Cleanup function to restore the original styles
    return () => {
      if (lock) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      }
    };
  }, [lock]);
}
