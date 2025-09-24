import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { QueryClient } from '@tanstack/react-query'

// Export both createRouter and getRouter for compatibility
export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    // Temporary: routeTree.gen still expects a context with QueryClient due to previous
    // createRootRouteWithContext usage. Provide a dummy instance to satisfy types.
    // Once route tree is regenerated under createRootRoute, this can be removed.
    context: { queryClient: new QueryClient() },
  })

  return router
}

// TanStack Start expects getRouter function
export function getRouter() {
  return createRouter()
}

// You must register your router instance with TanStack Router's type system
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
