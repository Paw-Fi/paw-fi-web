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
    '/profile': {
      parentRoute: RegisteredRoutes['/']
    }
    '/user-settings': {
      parentRoute: RegisteredRoutes['/']
    }
    '/register': {
      parentRoute: RegisteredRoutes['/']
    }
    '/login': {
      parentRoute: RegisteredRoutes['/']
    }
    '/onboarding': {
      parentRoute: RegisteredRoutes['/']
    }
    '/pricing': {
      parentRoute: RegisteredRoutes['/']
    }
    '/dashboard': {
      parentRoute: RegisteredRoutes['/']
    }
    '/dashboard/learning': {
      parentRoute: RegisteredRoutes['/dashboard']
    }
    '/dashboard/learning/$courseId': {
      parentRoute: RegisteredRoutes['/dashboard/learning']
    }
    '/dashboard/learning/$courseId/lesson/$lessonId': {
      parentRoute: RegisteredRoutes['/dashboard/learning/$courseId']
    }   
    '/dashboard/timeline': {
      parentRoute: RegisteredRoutes['/dashboard']
    }
    '/blogs/$blogId': {
      parentRoute: RegisteredRoutes['/']
    }
    '/author/import': {
      parentRoute: RegisteredRoutes['/']
    }
    '/author/course/$courseId': {
      parentRoute: RegisteredRoutes['/']
    }
    '/signup': {
      parentRoute: RegisteredRoutes['/']
    }
    '/dashboard/tracker/$goalId': {
      parentRoute: RegisteredRoutes['/dashboard']
    }
  }
}
