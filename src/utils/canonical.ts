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
  // Normalize path - remove trailing slash except for root
  let normalizedPath = routePath.replace(/\/$/, '') || '/';
  
  // Remove query parameters and fragments for canonical URL
  normalizedPath = normalizedPath.split('?')[0].split('#')[0];
  
  // Convert common variations to canonical form
  if (normalizedPath === '/index' || normalizedPath === '/home') {
    return '/';
  }
  
  // Remove common unnecessary path segments
  if (normalizedPath.startsWith('/dashboard/calculators')) {
    return normalizedPath.replace('/dashboard/calculators', '/calculators');
  }
  
  return normalizedPath;
}

/**
 * Creates a redirect map for URL canonicalization
 * @returns Object mapping non-canonical URLs to canonical ones
 */
export function getRedirectMap(): Record<string, string> {
  return {
    '/index': '/',
    '/home': '/',
    '/index.html': '/',
    '/home.html': '/',
  };
}
