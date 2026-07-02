import { readFile } from "fs/promises";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { VitePluginRadar } from "vite-plugin-radar";
import tailwindcss from "@tailwindcss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function devJsonSourceImportPlugin(): Plugin {
  const srcRoot = resolve(__dirname, "src");

  return {
    name: "moneko-dev-json-source-imports",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || (req.method !== "GET" && req.method !== "HEAD")) {
          next();
          return;
        }

        const url = new URL(req.url, "http://localhost");
        const isJsonSourceRequest =
          url.pathname.startsWith("/src/") && url.pathname.endsWith(".json");
        const isModuleRequest =
          url.searchParams.has("import") ||
          url.searchParams.has("raw") ||
          url.searchParams.has("url");

        if (!isJsonSourceRequest || !isModuleRequest) {
          next();
          return;
        }

        const relativePath = decodeURIComponent(url.pathname.slice(1));
        const filePath = resolve(__dirname, relativePath);

        if (filePath !== srcRoot && !filePath.startsWith(`${srcRoot}/`)) {
          res.statusCode = 403;
          res.end();
          return;
        }

        try {
          const json = await readFile(filePath, "utf8");
          const body = url.searchParams.has("raw")
            ? `export default ${JSON.stringify(json)};\n`
            : url.searchParams.has("url")
              ? `export default ${JSON.stringify(url.pathname)};\n`
              : `export default ${JSON.stringify(JSON.parse(json))};\n`;

          res.statusCode = 200;
          res.setHeader("Content-Type", "text/javascript");
          res.setHeader("Cache-Control", "no-cache");
          res.end(req.method === "HEAD" ? undefined : body);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            next();
            return;
          }

          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ command, isSsrBuild }) => {
  const isClientBuild = !isSsrBuild;
  const isBuild = command === "build";

  return {
    logLevel: isBuild ? "warn" : "info",
    server: {
      host: "localhost",
      port: 3000,
    },
    // Disable sourcemaps in production to drastically reduce build memory usage
    // This is the #1 cause of Vite/Rollup OOM during SSR builds
    build: {
      sourcemap: false,
      reportCompressedSize: false,
      // Increase chunk size warning limit (reduces Rollup overhead)
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: isClientBuild
          ? {
              manualChunks(id) {
                if (!id.includes("node_modules")) {
                  return undefined;
                }

                if (
                  id.includes("react-markdown") ||
                  id.includes("remark-gfm") ||
                  id.includes("rehype-raw")
                ) {
                  return "vendor-markdown";
                }

                if (id.includes("react-toastify")) {
                  return "vendor-notifications";
                }

                if (
                  id.includes("chart.js") ||
                  id.includes("react-chartjs-2") ||
                  id.includes("recharts")
                ) {
                  return "vendor-charts";
                }

                if (
                  id.includes("mermaid") ||
                  id.includes("cytoscape") ||
                  id.includes("katex") ||
                  id.includes("dagre")
                ) {
                  return "vendor-diagrams";
                }

                if (id.includes("framer-motion") || id.includes("/motion/")) {
                  return "vendor-animation";
                }

                if (id.includes("svg-dotted-map")) {
                  return "vendor-map";
                }

                if (id.includes("/@radix-ui/")) {
                  return "vendor-ui";
                }

                if (
                  id.includes("/react/") ||
                  id.includes("/react-dom/") ||
                  id.includes("/scheduler/")
                ) {
                  return "vendor-react";
                }

                return undefined;
              },
            }
          : undefined,
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
        "svg-dotted-map",
      ],
    },
    plugins: [
      devJsonSourceImportPlugin(),
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tanstackStart({
        prerender: {
          enabled: false,
          crawlLinks: false,
          filter: ({ path }) => {
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
          onSuccess: ({ page }) => {
            console.log(`✅ Prerendered: ${page.path}`);
          },
        },
        router: {
          autoCodeSplitting: true,
        },
      } as any),
      nitro({
        config: {
          preset: "node-server",
          logLevel: 1,
          logging: {
            compressedSizes: false,
            buildSuccess: false,
          },
          minify: false,
          inlineDynamicImports: false,
          sourceMap: false,
          externals: {
            external: [
              /^@radix-ui\//,
              /^framer-motion$/,
              /^motion$/,
              /^motion\//,
              /^react-toastify$/,
              /^recharts$/,
              /^chart\.js$/,
              /^react-chartjs-2$/,
              /^mermaid$/,
              /^cytoscape/,
              /^katex$/,
              /^dagre$/,
              /^three$/,
              /^@react-three\/fiber$/,
              /^lottie-react$/,
              /^lottie-web$/,
              /^svg-dotted-map$/,
            ],
          },
        },
      } as any),
      viteReact(),
      tailwindcss(),
      ...(isClientBuild
        ? [
            VitePluginRadar({
              analytics: {
                id: "G-KBNN5QXD4G",
              },
            }),
          ]
        : []),
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
  };
});
