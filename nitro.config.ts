import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  // Ensure compatibility with Google Cloud Run
  preset: 'node-server',
  
  // Configure server to listen on all interfaces and use PORT environment variable
  runtimeConfig: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 3000
  },
  
  // Development server configuration
  devServer: {
    host: '0.0.0.0',
    port: 3000
  }
})