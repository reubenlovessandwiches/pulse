import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Port the dev/preview server listens on. Defaults to 5173.
const port = Number(process.env.PORT ?? 5173);

// Base public path the app is served under. Defaults to "/".
const basePath = process.env.BASE_PATH ?? "/";

// Where the frontend proxies "/api" requests during development.
// Point this at the API server (defaults to http://localhost:5000).
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:5000";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("recharts") ||
            id.includes("/d3-") ||
            id.includes("victory-vendor")
          )
            return "charts";
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          )
            return "react-vendor";
          if (id.includes("@radix-ui")) return "radix";
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    proxy: {
      // Forward API calls to the backend so the browser stays same-origin.
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
});
