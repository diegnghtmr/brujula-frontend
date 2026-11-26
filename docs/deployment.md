# Brújula frontend deployment

The [OpenAPI contract](../openapi/brujula-api.v1.yaml) gives the generated Axios client the base `/api/v1`. Spring's generated controller paths, such as `/me`, `/admin/*`, and `/staff/*`, do not include that prefix. [Vite](../vite.config.ts) strips it in dev and preview mode; that proxy does not exist when serving the built files from a static host.

For example, in nginx, with an upstream reachable as `brujula-backend:8080`:

```nginx
location /api/v1/ {
    rewrite ^/api/v1/(.*)$ /$1 break;
    proxy_pass http://brujula-backend:8080;
}
```

This only covers the API. Also route `/oauth2/*` and `/login/oauth2/*` to Spring without rewriting them, and use a Keycloak callback registered for the deployed origin. Serve the SPA's index for client routes. Without the API rewrite, calls to the prefixed paths return `404`.

Another option is `server.servlet.context-path=/api/v1` in Spring. In that topology preserve the API prefix at the proxy and account for the context path in the OAuth start, callback, and proxy configuration too. The production artifact does not consult `VITE_API_BASE_URL` to change the browser's API prefix; that setting is only the target used by Vite's proxy process.
