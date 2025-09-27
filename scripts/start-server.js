#!/usr/bin/env node

import { existsSync } from 'fs'
import { resolve } from 'path'
import { spawn } from 'child_process'

const __dirname = new URL('.', import.meta.url).pathname
const projectRoot = resolve(__dirname, '..')

// Check for .output/server/index.mjs (Nitro build)
const nitroServer = resolve(projectRoot, '.output/server/index.mjs')
// Check for dist/server/server.js (Default TanStack Start build)
const defaultServer = resolve(projectRoot, 'dist/server/server.js')

let serverPath = null

if (existsSync(nitroServer)) {
  console.log('🚀 Starting Nitro server (.output/server/index.mjs)')
  serverPath = nitroServer
} else if (existsSync(defaultServer)) {
  console.log('🚀 Starting default TanStack Start server (dist/server/server.js)')
  serverPath = defaultServer
} else {
  console.error('❌ No server build found!')
  console.error('Expected either:')
  console.error('  - .output/server/index.mjs (Nitro build)')
  console.error('  - dist/server/server.js (Default TanStack Start build)')
  process.exit(1)
}

// Set PORT from environment variable, default to 3000
const port = process.env.PORT || 3000
process.env.PORT = port

// For cloud environments, ensure we listen on all interfaces
if (!process.env.HOST && !process.env.NITRO_HOST) {
  process.env.HOST = '0.0.0.0'
}

console.log(`🌐 Server will listen on ${process.env.HOST || 'localhost'}:${port}`)

// Start the server
const serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env }
})

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})

serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`)
  process.exit(code)
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully')
  serverProcess.kill('SIGTERM')
})

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully')
  serverProcess.kill('SIGINT')
})