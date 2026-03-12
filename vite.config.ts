import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { VitePluginRadar } from "vite-plugin-radar";
import compression from "vite-plugin-compression";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  server: {
    port: 3000,
  },
  // Disable sourcemaps in production to drastically reduce build memory usage
  // This is the #1 cause of Vite/Rollup OOM during SSR builds
  build: {
    sourcemap: false,
    // Increase chunk size warning limit (reduces Rollup overhead)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Manual chunks to split heavy vendor dependencies
        // NOTE: Do NOT include modules that are in ssr.external - they conflict during SSR build
        // (recharts, chart.js, react-chartjs-2, three, lottie-react are externalized for SSR)
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-animation": ["framer-motion", "motion"],
          "vendor-ui": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-dialog",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
          ],
        },
      },
    },
  },
  // Externalize heavy client-only dependencies from SSR bundle
  // These don't need to run on the server and massively increase SSR bundle size
  ssr: {
    noExternal: ["@tanstack/react-router", "@tanstack/react-start"],
    external: [
      "three",
      "@react-three/fiber",
      "lottie-web",
      "lottie-react",
      "mermaid",
      "chart.js",
      "recharts",
      "react-chartjs-2",
    ],
  },
  plugins: [
    TanStackRouterVite({
      autoCodeSplitting: true,
    }),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      prerender: {
        // Enable prerendering globally
        enabled: false,

        // CRITICAL: Disable crawlLinks to prevent automatic link discovery
        // When crawlLinks is false, ONLY the paths specified in the filter will be prerendered
        // When crawlLinks is true, it will extract links from HTML and prerender them too
        crawlLinks: false,

        // Filter function takes the page object and returns whether it should prerender
        filter: ({ path }) => {
          // Only prerender the specific paths you want to be static
          // All other paths (dashboard, blogs, etc.) will remain dynamic SSR routes
          const staticPaths = [
            "/",
            "/passive-income/business-cash-flow",
            "/passive-income/high-interest-portfolios",
            "/passive-income/time-to-wealth",
            "/pricing",
            "/login",
            "/register",
            "/calculators",
            "/early-access",
            "/onboarding",
          ];
          return staticPaths.includes(path);
        },

        // Callback when page is successfully rendered
        onSuccess: ({ page }) => {
          console.log(`✅ Prerendered: ${page.path}`);
        },
      },
    }),
    nitro({
      config: {
        preset: "node-server",
      },
    }),
    viteReact(),
    tailwindcss(),
    VitePluginRadar({
      analytics: {
        id: "G-KBNN5QXD4G",
      },
    }),
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
      deleteOriginFile: false,
    }),
    compression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@types": resolve(__dirname, "./src/types"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@contexts": resolve(__dirname, "./src/contexts"),
      "@assets": resolve(__dirname, "./src/assets"),
      "@styles": resolve(__dirname, "./src/styles"),
    },
  },
});
