/**
 * Utility functions for interacting with browser localStorage
 */

const STORAGE_PREFIX = 'moneko_';

/**
 * Save data to localStorage with the Moneko prefix
 */
export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Get data from localStorage with the Moneko prefix
 */
export function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error('Error retrieving from localStorage:', error);
    return fallback;
  }
  return fallback;
}

/**
 * Remove data from localStorage with the Moneko prefix
 */
export function removeFromStorage(key: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }
}
