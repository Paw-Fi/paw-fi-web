// vite.config.ts
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VitePluginRadar } from 'vite-plugin-radar';
import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import  compression  from 'vite-plugin-compression'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: true, // Enable tree shaking to reduce bundle size and memory usage
      output: {
        // Optimize chunk splitting to reduce memory usage during build
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['@tanstack/react-router', '@tanstack/react-start'],
          ui: ['@radix-ui/react-slot', '@radix-ui/react-toast'],
        },
        // Reduce chunk size limits to prevent memory issues
        maxParallelFileOps: 2, // Limit parallel operations to reduce memory pressure
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        // More aggressive compression to reduce bundle size
        passes: 2,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: true,
    },
    cssMinify: true,
    target: 'es2020',
    chunkSizeWarningLimit: 500, // Reduced from 1000 to encourage smaller chunks
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
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    VitePluginRadar({
      analytics: {
        id: 'G-KBNN5QXD4G',
      },
    }),
    tanstackStart({
      target: 'node-server',
      customViteReactPlugin: true,
      // Reduced prerender list to critical pages only to reduce memory usage during build
      pages:[
        {
          path: '/',
          prerender:{enabled:true}
        },
        {
          path: '/pricing',
          prerender:{enabled:true}
        },  
        {
          path: '/login',
          prerender:{enabled:true}
        },  
        {
          path: '/register',
          prerender:{enabled:true}
        },  
        {
          path: '/calculators',
          prerender:{enabled:true}
        },
        {
          path: '/calculators/compound-calculator',
          prerender:{enabled:true}
        },
        {
          path: '/early-access',
          prerender:{enabled:true}
        }
      ]
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