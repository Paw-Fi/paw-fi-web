/**
 * Generates a unique ID for use in the application.
 * This is a simple implementation that can be replaced with UUID or other algorithms.
 * 
 * @returns A unique string ID
 */
export function generateUniqueId(): string {
  // Format: timestamp-random
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Generates a short, user-friendly ID suitable for display.
 * 
 * @returns A short, readable ID string
 */
export function generateShortId(): string {
  // Format a short alphanumeric string (4 characters)
  return Math.random().toString(36).substring(2, 6);
}
