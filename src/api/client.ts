/**
 * Shared Axios instance for Brújula API.
 * DESIGN §2: CSRF-aware instance — reads XSRF cookie and sets X-XSRF-TOKEN header on writes.
 * Base URL /api/v1 (relative — Vite proxies /api → localhost:8080).
 * withCredentials: true to send session cookie on all requests.
 *
 * AGENTS §4.2 / TRD §19.2: components NEVER call axios directly.
 * All API calls go through generated *Api classes instantiated here.
 */

import axios, { type AxiosInstance, type AxiosError } from "axios";

// Re-export AxiosError type so consumers don't need to import axios directly
export type { AxiosError };

function getCookie(name: string): string | undefined {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : undefined;
}

function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: "/api/v1",
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 30_000,
  });

  // CSRF interceptor: read XSRF-TOKEN cookie and set X-XSRF-TOKEN header on mutating requests
  instance.interceptors.request.use((config) => {
    const method = (config.method ?? "get").toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      const token = getCookie("XSRF-TOKEN");
      if (token) {
        config.headers["X-XSRF-TOKEN"] = token;
      }
    }
    return config;
  });

  return instance;
}

/** Shared axios instance — used by all generated API classes. */
export const apiClient = createApiClient();

/**
 * Factory for generated API class instances.
 * Usage:
 *   import { AuthApi } from "@/api/generated";
 *   import { createApiInstance } from "@/api/client";
 *   const authApi = createApiInstance(AuthApi);
 */
export function createApiInstance<T>(
  ApiClass: new (
    configuration: undefined,
    basePath: string,
    axiosInstance: AxiosInstance
  ) => T
): T {
  return new ApiClass(undefined, "", apiClient);
}
