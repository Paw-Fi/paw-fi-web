// vite.config.ts
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VitePluginRadar } from 'vite-plugin-radar';
import viteReact from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
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
    host: '0.0.0.0', // Allow external connections for Docker/containers
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({
      target: 'node-server',
      customViteReactPlugin: true,
      sitemap: {
        host: 'https://moneko.io'
      },
      pages:[
        {
          path: '/',
          prerender:{enabled:true}
        },
        {
          path: '/passive-income/business-cash-flow',
          prerender:{enabled:true}
        },
        {
          path: '/passive-income/high-interest-portfolios',
          prerender:{enabled:true}
        },
        {
          path: '/passive-income/time-to-wealth',
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
          path: '/early-access',
          prerender:{enabled:true}
        },
        {
          path: '/onboarding',
          prerender:{enabled:true}
        },
        {
          path: '/dashboard',
          prerender:{enabled:true}
        },
        {
          path: '/dashboard/tracker?filter=all&sort=due-date',
          prerender:{enabled:true}
        },
        {
          path: '/dashboard/learning',
          prerender:{enabled:true}
        },     
        {
          path: '/dashboard/portfolio',
          prerender:{enabled:true}
        }
      ]
    }),
    // React plugin must come after TanStack Start plugin
    viteReact(),
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
});