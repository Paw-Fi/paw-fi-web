#!/usr/bin/env node

import { existsSync, createReadStream } from 'fs'
import { resolve, extname } from 'path'
import { spawn } from 'child_process'
import { pathToFileURL } from 'url'
import { stat } from 'fs/promises'
import { serve as serveNode } from 'srvx/node'

const __dirname = new URL('.', import.meta.url).pathname
const projectRoot = resolve(__dirname, '..')

// Check for .output/server/index.mjs (Nitro build)
const nitroServer = resolve(projectRoot, '.output/server/index.mjs')
// Check for dist/server/server.js (TanStack Start server bundle exporting a fetch handler)
const defaultServer = resolve(projectRoot, 'dist/server/server.js')
// Directory containing built client assets
const clientDir = resolve(projectRoot, 'dist/client')

function withSecurityHeaders(response) {
  if (process.env.NODE_ENV !== 'production' || !response) {
    return response
  }

  const headers = new Headers(response.headers)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.supabase.co https://*.supabase.co https://www.google-analytics.com https://www.reddit.com https://reddit.com https://api.reddit.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  )
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'SAMEORIGIN')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function start() {
  // Set PORT from environment variable, default to 3000
  const port = process.env.PORT || '3000'
  const host = process.env.HOST || '0.0.0.0'

  process.env.PORT = port

  // For cloud environments, ensure we listen on all interfaces unless explicitly overridden
  if (!process.env.HOST && !process.env.NITRO_HOST) {
    process.env.HOST = host
  }

  // Prefer Nitro server if it exists (historical behavior)
  if (existsSync(nitroServer)) {
    console.log('🚀 Starting Nitro server (.output/server/index.mjs)')
    console.log(`🌐 Server will listen on ${process.env.HOST}:${port}`)

    const serverProcess = spawn('node', [nitroServer], {
      stdio: 'inherit',
      env: { ...process.env },
    })

    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start Nitro server:', error)
      process.exit(1)
    })

    serverProcess.on('exit', (code) => {
      console.log(`Nitro server process exited with code ${code}`)
      process.exit(code ?? 1)
    })

    // Handle graceful shutdown for Nitro child process
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down Nitro server gracefully')
      serverProcess.kill('SIGTERM')
    })

    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down Nitro server gracefully')
      serverProcess.kill('SIGINT')
    })

    return
  }

  // Fallback: start TanStack Start server bundle directly via srvx/node
  if (existsSync(defaultServer)) {
    console.log('🚀 Starting TanStack Start server (dist/server/server.js) via srvx/node')
    console.log(`🌐 Server will listen on ${host}:${port}`)

    const serverModule = await import(pathToFileURL(defaultServer).toString())
    // TanStack Start’s server bundle exports a server entry with a fetch handler
    const server = serverModule.default ?? serverModule.server ?? serverModule
    const fetchHandler =
      typeof server.fetch === 'function' ? server.fetch.bind(server) : server

    async function handleStaticAsset(request) {
      const url = new URL(request.url)
      const pathname = url.pathname

      // Only handle built asset paths
      if (!pathname.startsWith('/assets/')) {
        return null
      }

      const relativePath = pathname.replace(/^\/+/, '')
      const filePath = resolve(clientDir, relativePath)

      // Prevent path traversal
      if (!filePath.startsWith(clientDir)) {
        return null
      }

      let fileStat
      try {
        fileStat = await stat(filePath)
      } catch {
        return null
      }

      if (!fileStat.isFile()) {
        return null
      }

      const ext = extname(filePath)
      const mimeTypes = {
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/vnd.microsoft.icon',
      }

      const contentType = mimeTypes[ext] || 'application/octet-stream'
      const stream = createReadStream(filePath)

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileStat.size.toString(),
        },
      })
    }

    const nodeServer = serveNode({
      port: Number(port),
      hostname: host,
      // Serve static assets from dist/client/assets first, then delegate to SSR
      fetch: async (request) => {
        const staticResponse = await handleStaticAsset(request)
        if (staticResponse) {
          return withSecurityHeaders(staticResponse)
        }
        const response = await fetchHandler(request)
        return withSecurityHeaders(response)
      },
    })

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully')
      nodeServer.node.server.close(() => process.exit(0))
    })

    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully')
      nodeServer.node.server.close(() => process.exit(0))
    })

    // Do not exit here: the HTTP server keeps the event loop alive
    return
  }

  console.error('❌ No server build found!')
  console.error('Expected either:')
  console.error('  - .output/server/index.mjs (Nitro build)')
  console.error('  - dist/server/server.js (TanStack Start build)')
  process.exit(1)
}

start().catch((error) => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})