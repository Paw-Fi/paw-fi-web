/// <reference types="vinxi/types/server" />
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { getRouterManifest } from '@tanstack/react-start/router-manifest'
import { HelmetProvider } from 'react-helmet-async'
import { createElement } from 'react'

import { createRouter } from './router'

// Custom handler that integrates react-helmet-async for proper Open Graph meta tags
const customHandler = (innerHandler: any) => {
  return async (ctx: any) => {
    // Create helmet context for server-side rendering
    const helmetContext = {}
    
    // Wrap the app with HelmetProvider
    const wrappedCreateRouter = () => {
      const router = createRouter()
      
      // Enhance router with HelmetProvider wrapper
      const originalRender = router.render
      router.render = (opts: any) => {
        return createElement(HelmetProvider, { context: helmetContext }, originalRender(opts))
      }
      
      return router
    }
    
    // Call the inner handler with our wrapped router
    const result = await innerHandler({
      ...ctx,
      createRouter: wrappedCreateRouter,
    })
    
    // Extract helmet data and inject into HTML
    const helmet = (helmetContext as any).helmet
    if (helmet && typeof result === 'string') {
      // Inject helmet meta tags into the HTML head
      const headContent = [
        helmet.title?.toString() || '',
        helmet.meta?.toString() || '',
        helmet.link?.toString() || '',
      ].filter(Boolean).join('')
      
      // Insert helmet content into head section
      return result.replace('</head>', `${headContent}</head>`)
    }
    
    return result
  }
}

export default createStartHandler({
  createRouter,
  getRouterManifest,
})(customHandler(defaultStreamHandler))
