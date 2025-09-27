import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { VitePluginRadar } from 'vite-plugin-radar'
import compression from 'vite-plugin-compression'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({
      prerender: {
        // Enable prerendering globally
        enabled: true,
        // Filter function takes the page object and returns whether it should prerender
        filter: ({ path }) => {
          // Only prerender the specific paths you want to be static
          // Dashboard paths should NOT be prerendered as they require user auth and dynamic data
          const staticPaths = [
            '/',
            '/passive-income/business-cash-flow',
            '/passive-income/high-interest-portfolios', 
            '/passive-income/time-to-wealth',
            '/pricing',
            '/login',
            '/register',
            '/calculators',
            '/early-access',
            '/onboarding'
          ]
          return staticPaths.includes(path)
        },
        // Callback when page is successfully rendered
        onSuccess: ({ page }) => {
          console.log(`✅ Prerendered: ${page.path}`)
        },
      }
    }),
    nitro(),
    viteReact(),
    tailwindcss(),
    VitePluginRadar({
      analytics: {
        id: 'G-KBNN5QXD4G',
      },
    }),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils'),
      '@contexts': resolve(__dirname, './src/contexts'),
      '@assets': resolve(__dirname, './src/assets'),
      '@styles': resolve(__dirname, './src/styles'),
    },
  },
})