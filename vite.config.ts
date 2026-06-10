import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// https://vitejs.dev/config/
//
// T-WU7.2 — Compose proxy parity:
// In `vite dev`, the `server.proxy` block routes /api/v1, /oauth2 and /login/oauth2
// to the backend. In `vite preview` (used by the Docker compose frontend container)
// the same rules are mirrored under `preview.proxy`.
//
// T-WU7 fix (proxy rewrite): The OpenAPI spec uses `servers: [{url: /api/v1}]` which
// makes the generated Axios client prepend /api/v1 to every path (e.g. /api/v1/me).
// Spring Boot controllers are generated from the same spec WITHOUT the servers base
// path — controller paths are spec-relative (/me, /admin/*, /staff/*, etc.).
// The proxy rewrites /api/v1/* → /* so the backend receives the paths it maps to.
//
// !! PRODUCTION DEPLOYMENT REQUIREMENT !!
// This Vite proxy only applies in dev (`vite dev`) and preview (`vite preview`).
// In a production deployment (static SPA served by nginx, Caddy, etc.) there is no
// Vite proxy — the browser sends requests to the real server as-is.
//
// The frontend SPA sends all API calls to /api/v1/* (e.g. GET /api/v1/me).
// The Spring Boot backend does NOT set server.servlet.context-path=/api/v1
// (controllers are mounted at the root: GET /me, GET /admin/*, POST /staff/*, etc.).
//
// REQUIRED: any production reverse proxy (nginx, Caddy, Traefik, …) MUST rewrite
// incoming /api/v1/* requests to remove the prefix before forwarding to the backend:
//
//   nginx example:
//     location /api/v1/ {
//       rewrite ^/api/v1/(.*)$ /$1 break;
//       proxy_pass http://brujula-backend:8080;
//     }
//
// Alternative: set server.servlet.context-path=/api/v1 in Spring application.yaml
// to mount the backend at /api/v1 directly (eliminates the need for the rewrite).
//
// Without this rewrite, the backend returns 404 for all API calls in production.
const backendTarget =
  process.env["VITE_API_BASE_URL"] ?? "http://localhost:8080";

const backendProxy = {
  "/api/v1": {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/api\/v1/, ""),
  },
  "/oauth2": {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
  },
  "/login/oauth2": {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
  },
};

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Proxy all /api/* requests to the Spring Boot backend (TRD §9.4)
    // W-WUD-001 fix: previously unproxied /oauth2 and /login/oauth2 caused Vite SPA fallback in dev mode
    proxy: backendProxy,
  },
  preview: {
    port: 5173,
    // T-WU7.2: mirror server.proxy under preview so compose frontend container
    // correctly forwards OIDC and API calls to the backend container.
    proxy: backendProxy,
  },
});
