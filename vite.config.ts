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