// Import directly from the config package to ensure compatibility
import { defineConfig } from '@tanstack/react-start-config'
import tsConfigPaths from 'vite-tsconfig-paths'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { VitePluginRadar } from 'vite-plugin-radar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  server: {
    preset: 'node-server', // Explicitly set the preset for Vinxi
  },
  tsr: {
    appDirectory: 'src',
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ['./tsconfig.json'],
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
})
