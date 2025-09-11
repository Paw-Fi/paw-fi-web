// vite.config.ts
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VitePluginRadar } from 'vite-plugin-radar';
import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import  compression  from 'vite-plugin-compression'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: true, // Enable tree-shaking for better bundle optimization
      output: {
        // Manual chunk splitting for better loading performance
        manualChunks: (id) => {
          // Vendor chunks - separate large libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            if (id.includes('@tanstack')) {
              return 'tanstack';
            }
            if (id.includes('framer-motion')) {
              return 'framer';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('supabase')) {
              return 'supabase';
            }
            return 'vendor';
          }
          // Component chunks - group by feature
          if (id.includes('src/components/dashboard')) {
            return 'dashboard';
          }
          if (id.includes('src/components/calculators')) {
            return 'calculators';
          }
          if (id.includes('src/components/learning')) {
            return 'learning';
          }
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2, // Multiple passes for better compression
      },
    },
    cssMinify: true,
    target: 'es2020',
    chunkSizeWarningLimit: 500, // Lower threshold to catch large chunks early
    sourcemap: false, // Disable sourcemaps in production for smaller bundles
  },
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    // TanStack Router with optimized code splitting for performance
    TanStackRouterVite({
      autoCodeSplitting: true,
      // Split components and heavy loaders for better initial loading
      codesSplitGroupings: [
        ['component', 'errorComponent', 'notFoundComponent', 'pendingComponent'],
        ['loader'] // Separate loaders for streaming
      ]
    }),
    VitePluginRadar({
      analytics: {
        id: 'G-KBNN5QXD4G',
      },
    }),
    tanstackStart({
      customViteReactPlugin: true,
      // Enable streaming SSR for better initial loading performance
      streaming: true,
      // Use concurrent features for React 19
      concurrent: true,
    }),
    react(),
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
});