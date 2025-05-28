import { defineConfig } from '@tanstack/react-start/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { VitePluginRadar } from 'vite-plugin-radar';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  tsr: {
    appDirectory: 'src',
  },
  vite: {
    plugins: [
      tailwindcss(),
      TanStackRouterVite({ 
        autoCodeSplitting: true,
        routeFilePrefix: '',
      }),
      VitePluginRadar({
        analytics: {
          id: 'G-KVHTSD1MF1',
        },
      })
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
  },
});
