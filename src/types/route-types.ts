import '@tanstack/react-router'

// Extend the RouteNamespace interface to include our custom routes
declare module '@tanstack/react-router' {
  interface RegisteredRoutes {
    '/': {
      parentRoute: RegisteredRoutes['/']
    }
    '/learning': {
      parentRoute: RegisteredRoutes['/']
    }
    '/learning/your-2025-guide-to-investing': {
      parentRoute: RegisteredRoutes['/']
    }
    '/calculators': {
      parentRoute: RegisteredRoutes['/']
    }
    '/chat': {
      parentRoute: RegisteredRoutes['/']
    }
    '/intro': {
      parentRoute: RegisteredRoutes['/']
    }
    '/privacy-policy': {
      parentRoute: RegisteredRoutes['/']
    }
    '/terms-of-service': {
      parentRoute: RegisteredRoutes['/']
    }
    '/cookie-policy': {
      parentRoute: RegisteredRoutes['/']
    }
  }
}
