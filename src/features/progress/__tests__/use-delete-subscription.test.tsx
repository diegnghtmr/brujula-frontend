/**
 * useDeleteSubscription — hook tests (WU-1 Fix B)
 *
 * Spec scenarios:
 * B.hook.1  Successful delete: calls DELETE /me/subscriptions/{id} and invalidates ["subscriptions"]
 * B.hook.2  The mutation fn passes subscriptionId correctly to the API
 */

import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useDeleteSubscription } from "@/features/progress/hooks/use-delete-subscription";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe("useDeleteSubscription (WU-1 Fix B)", () => {
  it("B.hook.1: DELETE 204 → invalidates ['subscriptions'] query", async () => {
    let deleteCount = 0;

    server.use(
      http.delete("/api/v1/me/subscriptions/:id", () => {
        deleteCount++;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { queryClient, wrapper } = createWrapper();

    // Pre-seed the cache so we can track invalidation
    queryClient.setQueryData(["subscriptions"], [{ id: "sub-1" }]);

    const { result } = renderHook(() => useDeleteSubscription(), { wrapper });

    result.current.mutate({ subscriptionId: "sub-1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // DELETE endpoint was called once
    expect(deleteCount).toBe(1);

    // After invalidation, the cached data is gone (query becomes stale/undefined)
    // TanStack Query marks the query as invalidated — the stale flag is set
    const queryState = queryClient.getQueryState(["subscriptions"]);
    expect(queryState?.isInvalidated).toBe(true);
  });

  it("B.hook.2: passes subscriptionId in the DELETE URL path", async () => {
    let capturedSubscriptionId: string | undefined;

    server.use(
      http.delete("/api/v1/me/subscriptions/:id", ({ params }) => {
        capturedSubscriptionId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteSubscription(), { wrapper });

    result.current.mutate({ subscriptionId: "sub-xyz-456" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(capturedSubscriptionId).toBe("sub-xyz-456");
  });
});
