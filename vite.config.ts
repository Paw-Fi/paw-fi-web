import { resolve } from 'path'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vitejs.dev/config/
// For compatibility with Firebase hosting
const _dirname = new URL('.', import.meta.url).pathname;

export default defineConfig({
  plugins: [
    tailwindcss(),
    TanStackRouterVite({ 
      autoCodeSplitting: true,
      routeFilePrefix: '',
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      '@': resolve(_dirname, './src'),
      '@components': resolve(_dirname, './src/components'),
      '@types': resolve(_dirname, './src/types'),
      '@utils': resolve(_dirname, './src/utils'),
      '@contexts': resolve(_dirname, './src/contexts'),
      '@assets': resolve(_dirname, './src/assets'),
      '@styles': resolve(_dirname, './src/styles'),
    },
  },
})
