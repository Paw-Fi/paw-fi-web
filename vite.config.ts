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
      treeshake: false,
      output: {
        // Optimize chunking strategy (excluding externalized modules)
        manualChunks: {
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-accordion', '@radix-ui/react-tabs'],
          'vendor-motion': ['framer-motion', 'motion'],
          'vendor-icons': ['@fortawesome/react-fontawesome', '@fortawesome/free-solid-svg-icons', '@fortawesome/free-brands-svg-icons'],
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
          'vendor-utils': ['lodash', 'date-fns', 'zod'],
        },
        // Better asset naming for long-term caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    cssMinify: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    // Enable asset inlining for small assets
    assetsInlineLimit: 2048,
  },
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    // TanStack Router with balanced code splitting - keep loaders in main bundle, split components
    TanStackRouterVite({
      autoCodeSplitting: true,
      codesSplitGroupings: [
        ['component', 'errorComponent', 'notFoundComponent', 'pendingComponent', 'loader']
      ]
    }),
    VitePluginRadar({
      analytics: {
        id: 'G-KBNN5QXD4G',
      },
    }),
    tanstackStart({
      customViteReactPlugin: true
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