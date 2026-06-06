/**
 * S1-G-4: useCurrentUser hook — TanStack Query hook wrapping the generated /me endpoint.
 * Tests: 200 authenticated path, 401 unauthenticated path.
 */

import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import type { CurrentUser } from "@/api/generated/models/current-user";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const MOCK_USER: CurrentUser = {
  id: "user-uuid-1",
  fullName: "Ana Gómez",
  email: "ana@uniquindio.edu.co",
  role: "STUDENT",
  status: "ACTIVE",
  onboardingCompleted: true,
};

describe("useCurrentUser hook (S1-G-4)", () => {
  it("returns user data when /me responds 200", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json(MOCK_USER);
      })
    );

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("user-uuid-1");
    expect(result.current.data?.email).toBe("ana@uniquindio.edu.co");
    expect(result.current.data?.role).toBe("STUDENT");
  });

  it("enters error state when /me responds 401 (unauthenticated)", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json(
          { title: "Unauthorized", status: 401 },
          { status: 401 }
        );
      })
    );

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it("isLoading is true while /me is pending", async () => {
    let resolveRequest!: () => void;
    const requestPromise = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.get("/api/v1/me", async () => {
        await requestPromise;
        return HttpResponse.json(MOCK_USER);
      })
    );

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    resolveRequest();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("isAuthenticated is true when data is present", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json(MOCK_USER);
      })
    );

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("isAuthenticated is false on 401 error", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json(
          { title: "Unauthorized", status: 401 },
          { status: 401 }
        );
      })
    );

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isAuthenticated).toBe(false);
  });
});
