import { registerGlobalMiddleware } from '@tanstack/react-start'
import { securityHeadersMiddleware } from '../middleware/security-headers'

/**
 * Register global middleware that applies to all server functions and routes
 * This ensures security headers are set on all responses
 */
registerGlobalMiddleware({
  middleware: [securityHeadersMiddleware],
})