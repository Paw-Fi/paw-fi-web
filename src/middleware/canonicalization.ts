import { getRedirectMap, getCanonicalPath } from '@/utils/canonical'

/**
 * Middleware to handle URL canonicalization redirects
 * Ensures all URLs redirect to their canonical form
 */
export function canonicalizationMiddleware(request: Request): Response | null {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Check if this URL needs a redirect
  const redirectMap = getRedirectMap()
  const canonicalPath = getCanonicalPath(pathname)
  
  // Direct redirect mapping
  if (redirectMap[pathname]) {
    return Response.redirect(new URL(redirectMap[pathname], url.origin).toString(), 301)
  }
  
  // Check for trailing slash issues (except root)
  if (pathname !== '/' && pathname.endsWith('/')) {
    const withoutTrailingSlash = pathname.slice(0, -1)
    return Response.redirect(new URL(withoutTrailingSlash + url.search, url.origin).toString(), 301)
  }
  
  // Check if canonical path differs from current path
  if (canonicalPath !== pathname) {
    return Response.redirect(new URL(canonicalPath + url.search, url.origin).toString(), 301)
  }
  
  // No redirect needed
  return null
}