import { useEffect, useState, RefObject } from 'react';

/**
 * Custom hook that detects when an element enters the viewport
 * @param ref - React ref object for the element to observe
 * @param threshold - Intersection threshold (0-1) that triggers the callback
 * @param once - Whether to disconnect the observer after the first intersection
 * @returns Boolean indicating if the element is in view
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  threshold: number = 0.1,
  once: boolean = true
): boolean {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, once]);

  return isInView;
}
