// vite.config.ts
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VitePluginRadar } from 'vite-plugin-radar';
import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: false
    }
  },
  server: {
    port: 3000,
    allowedHosts:["feasible-dog-thankful.ngrok-free.app"]
  },
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
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