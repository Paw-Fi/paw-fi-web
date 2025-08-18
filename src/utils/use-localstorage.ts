import { useState, useEffect, useCallback } from 'react';
import { saveToStorage, getFromStorage, removeFromStorage } from './storage';

/**
 * SSR-safe localStorage hook for Tanstack Start applications
 * 
 * This hook provides reactive localStorage functionality that:
 * - Safely handles server-side rendering (no localStorage access during SSR)
 * - Syncs with localStorage only on the client side
 * - Provides reactive state updates
 * - Handles cross-tab synchronization via storage events
 * - Uses the existing Moneko storage utilities for consistency
 * - Properly handles hydration mismatches
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state with default value (SSR-safe)
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [isClient, setIsClient] = useState(false);

  // Effect to mark when we're on the client and load initial value
  useEffect(() => {
    setIsClient(true);
    
    // Only access localStorage on the client
    if (typeof window !== 'undefined') {
      try {
        const item = getFromStorage(key, defaultValue);
        setStoredValue(item);
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        setStoredValue(defaultValue);
      }
    }
  }, [key, defaultValue]);

  // Function to update both state and localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Update React state
        setStoredValue(valueToStore);
        
        // Update localStorage only on client
        if (isClient && typeof window !== 'undefined') {
          saveToStorage(key, valueToStore);
          
          // Dispatch custom event for cross-tab synchronization
          window.dispatchEvent(
            new CustomEvent('local-storage-change', {
              detail: { key, value: valueToStore }
            })
          );
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, isClient]
  );

  // Function to remove the item from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue);
      
      if (isClient && typeof window !== 'undefined') {
        removeFromStorage(key);
        
        // Dispatch custom event for cross-tab synchronization
        window.dispatchEvent(
          new CustomEvent('local-storage-change', {
            detail: { key, value: undefined }
          })
        );
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue, isClient]);

  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    if (!isClient || typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `moneko_${key}` && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          setStoredValue(newValue);
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      } else if (e.key === `moneko_${key}` && e.newValue === null) {
        // Key was removed
        setStoredValue(defaultValue);
      }
    };

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        if (e.detail.value !== undefined) {
          setStoredValue(e.detail.value);
        } else {
          setStoredValue(defaultValue);
        }
      }
    };

    // Listen for native storage events (cross-tab)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom events (same-tab)
    window.addEventListener('local-storage-change', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleCustomStorageChange as EventListener);
    };
  }, [key, defaultValue, isClient]);

  return [storedValue, setValue, removeValue];
}

/**
 * Alternative hook that returns an object with more explicit API
 */
export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue, removeValue] = useLocalStorage(key, defaultValue);
  
  return {
    value,
    setValue,
    removeValue,
    clear: removeValue
  };
}

/**
 * Hook for boolean localStorage values with toggle functionality
 */
export function useLocalStorageBoolean(key: string, defaultValue = false) {
  const [value, setValue, removeValue] = useLocalStorage(key, defaultValue);
  
  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, [setValue]);
  
  const setTrue = useCallback(() => setValue(true), [setValue]);
  const setFalse = useCallback(() => setValue(false), [setValue]);
  
  return {
    value,
    setValue,
    toggle,
    setTrue,
    setFalse,
    removeValue,
    clear: removeValue
  };
}

/**
 * Hook for array localStorage values with array manipulation methods
 */
export function useLocalStorageArray<T>(key: string, defaultValue: T[] = []) {
  const [array, setArray, removeValue] = useLocalStorage(key, defaultValue);
  
  const push = useCallback((item: T) => {
    setArray(prev => [...prev, item]);
  }, [setArray]);
  
  const remove = useCallback((index: number) => {
    setArray(prev => prev.filter((_, i) => i !== index));
  }, [setArray]);
  
  const removeByValue = useCallback((item: T) => {
    setArray(prev => prev.filter(i => i !== item));
  }, [setArray]);
  
  const clear = useCallback(() => {
    setArray([]);
  }, [setArray]);
  
  const update = useCallback((index: number, item: T) => {
    setArray(prev => prev.map((existingItem, i) => i === index ? item : existingItem));
  }, [setArray]);
  
  return {
    array,
    setArray,
    push,
    remove,
    removeByValue,
    clear,
    update,
    removeValue,
    length: array.length
  };
}