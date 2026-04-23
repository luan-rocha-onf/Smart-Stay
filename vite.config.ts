import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/onfly-api": {
        target: "https://toguro-app-prod.onfly.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/onfly-api/, ""),
      },
      "/onfly-auth": {
        target: "https://api.onfly.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/onfly-auth/, ""),
      },
      "/nominatim": {
        target: "https://nominatim.openstreetmap.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nominatim/, ""),
      },
    },
  },
  optimizeDeps: {
    force: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
