/**
 * useDeleteSimulation — hook tests (mirrors use-delete-subscription pattern)
 *
 * Spec scenarios:
 * hook.1  Successful delete: calls DELETE /me/simulations/{id} and invalidates ["simulations"]
 * hook.2  The mutation fn passes simulationId correctly in the DELETE URL path
 */

import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useDeleteSimulation } from "@/features/simulation/hooks/use-delete-simulation";

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

describe("useDeleteSimulation", () => {
  it("hook.1: DELETE 204 → invalidates ['simulations'] query", async () => {
    let deleteCount = 0;

    server.use(
      http.delete("/api/v1/me/simulations/:id", () => {
        deleteCount++;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { queryClient, wrapper } = createWrapper();

    // Pre-seed the cache so we can track invalidation
    queryClient.setQueryData(["simulations", undefined, undefined], {
      content: [{ id: "sim-1" }],
      totalElements: 1,
    });

    const { result } = renderHook(() => useDeleteSimulation(), { wrapper });

    result.current.mutate({ simulationId: "sim-1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(deleteCount).toBe(1);

    // After invalidation the query state is marked stale/invalidated
    const queryState = queryClient.getQueryState(["simulations", undefined, undefined]);
    expect(queryState?.isInvalidated).toBe(true);
  });

  it("hook.2: passes simulationId in the DELETE URL path", async () => {
    let capturedSimulationId: string | undefined;

    server.use(
      http.delete("/api/v1/me/simulations/:id", ({ params }) => {
        capturedSimulationId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteSimulation(), { wrapper });

    result.current.mutate({ simulationId: "sim-xyz-789" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(capturedSimulationId).toBe("sim-xyz-789");
  });
});
