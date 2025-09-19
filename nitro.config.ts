import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  // Configure server to use PORT environment variable (for Google Cloud Run)
  runtimeConfig: {
    port: process.env.PORT || 3000
  },
  
  // Ensure the server listens on all interfaces (0.0.0.0) for cloud deployment
  devServer: {
    host: '0.0.0.0'
  }
})