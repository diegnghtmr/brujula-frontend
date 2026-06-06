import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api/* requests to the Spring Boot backend (TRD §9.4)
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // OIDC authorization redirect — Spring Security handles /oauth2/authorization/**
      // (W-WUD-001 fix: previously unproxied, causing Vite SPA fallback in dev mode)
      "/oauth2": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // OIDC authorization code callback — Keycloak redirects back to this path
      // after successful authentication (W-WUD-001 fix)
      "/login/oauth2": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
