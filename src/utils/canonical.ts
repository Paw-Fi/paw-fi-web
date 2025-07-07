// src/utils/canonical.ts
/**
 * Helper utility for generating consistent canonical URLs across the site
 */

const BASE_DOMAIN = 'https://moneko.io';

/**
 * Creates a canonical URL using the correct domain and path structure
 * @param path - The path portion of the URL (should start with a slash)
 * @returns Full canonical URL with the correct domain
 */
export function getCanonicalUrl(path: string): string {
  // Ensure path starts with a slash
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Combine with the base domain
  return `${BASE_DOMAIN}${formattedPath}`;
}

/**
 * Gets the canonical path based on the current route path
 * Useful when your canonical URL might differ from the actual route path
 * @param routePath - The current route path
 * @returns The canonical path to use
 */
export function getCanonicalPath(routePath: string): string {
  // Default behavior - use the same path
  // Override specific cases below as needed
  
  // Example: if you want calculators to appear without the dashboard prefix
  // if (routePath.startsWith('/dashboard/calculators')) {
  //   return routePath.replace('/dashboard/calculators', '/calculators');
  // }
  
  return routePath;
}
