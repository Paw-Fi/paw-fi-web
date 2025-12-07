#!/usr/bin/env node

import { existsSync } from 'fs'
import { resolve } from 'path'
import { spawn } from 'child_process'
import { pathToFileURL } from 'url'
import { serve as serveNode } from 'srvx/node'

const __dirname = new URL('.', import.meta.url).pathname
const projectRoot = resolve(__dirname, '..')

// Check for .output/server/index.mjs (Nitro build)
const nitroServer = resolve(projectRoot, '.output/server/index.mjs')
// Check for dist/server/server.js (TanStack Start server bundle exporting a fetch handler)
const defaultServer = resolve(projectRoot, 'dist/server/server.js')

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

    const nodeServer = serveNode({
      port: Number(port),
      hostname: host,
      fetch: fetchHandler,
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