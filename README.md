# Brújula Frontend

React 19 + TypeScript + Vite SPA for the Brújula academic planning platform.

## Production Deployment — API Proxy Requirement

**IMPORTANT**: The generated API client uses `/api/v1` as the base path (from the OpenAPI spec
`servers: [{url: /api/v1}]`). The Spring Boot backend does NOT set
`server.servlet.context-path=/api/v1` — controllers are mounted at root paths
(`/me`, `/admin/*`, `/staff/*`, etc.).

In development and the Docker compose preview container, Vite's proxy rewrites
`/api/v1/*` → `/*` automatically. **In production this rewrite does NOT exist.**

Any production reverse proxy (nginx, Caddy, Traefik, etc.) MUST perform this rewrite:

```nginx
# nginx example
location /api/v1/ {
    rewrite ^/api/v1/(.*)$ /$1 break;
    proxy_pass http://brujula-backend:8080;
}
```

**Alternative**: set `server.servlet.context-path=/api/v1` in the Spring Boot
`application.yaml` to mount the backend at `/api/v1` directly, which eliminates
the need for the reverse proxy rewrite.

Without this configuration, the backend returns 404 for all API calls in production.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## License

MIT, see [LICENSE](LICENSE).
