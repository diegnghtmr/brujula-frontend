/**
 * SimulationListPage — SIM-002, FE-001
 *
 * Lists simulations; status filter; create button navigates.
 * Delete scenarios mirror SubscriptionListPage / WU-1 Fix B pattern.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { SimulationListPage } from "@/features/simulation/components/simulation-list-page";

const SIMULATIONS_FIXTURE = {
  content: [
    {
      id: "sim-1",
      name: "Simulación DIURNA 2026-2",
      periodId: "period-1",
      periodName: "2026-2",
      programIds: ["prog-1"],
      status: "CURRENT",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: 1,
    },
    {
      id: "sim-2",
      name: "Simulación Desactualizada",
      periodId: "period-1",
      periodName: "2026-2",
      programIds: ["prog-2"],
      status: "OUTDATED",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: 2,
    },
  ],
  totalElements: 2,
  totalPages: 1,
  size: 20,
  number: 0,
};

function createWrapper(path = "/simulations") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [path] }, children)
    );
}

describe("SimulationListPage", () => {
  it("lists all simulations from GET /me/simulations", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE))
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Simulación DIURNA 2026-2")).toBeInTheDocument();
    expect(await screen.findByText("Simulación Desactualizada")).toBeInTheDocument();
  });

  it("shows CURRENT and OUTDATED status badges", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE))
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");
    // Status badges present (WCAG: color + text + icon)
    expect(screen.getByText("Vigente")).toBeInTheDocument();
    expect(screen.getByText("Desactualizada")).toBeInTheDocument();
  });

  it("create button navigates to /simulations/new", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE))
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
        <Route path="/simulations/new" element={<div data-testid="create-page">Crear</div>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");
    await user.click(screen.getByRole("button", { name: /nueva simulación|crear/i }));

    await waitFor(() => {
      expect(screen.getByTestId("create-page")).toBeInTheDocument();
    });
  });

  it("empty state renders when no simulations exist", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () =>
        HttpResponse.json({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 })
      )
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/no hay simulaciones|no tenés simulaciones/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Delete simulation scenarios (mirror SubscriptionListPage / WU-1 Fix B)
// ---------------------------------------------------------------------------

describe("SimulationListPage — Eliminar simulación", () => {
  it("SIM.del.1: each simulation card renders an 'Eliminar' button", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE))
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");

    const deleteButtons = screen.getAllByRole("button", { name: /eliminar simulación/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it("SIM.del.2: clicking 'Eliminar' shows confirmation strip — no DELETE fires", async () => {
    let deleteCount = 0;

    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE)),
      http.delete("/api/v1/me/simulations/:id", () => {
        deleteCount++;
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");

    // getAllByRole guarantees at least one element; non-null assertion is safe here
    const firstDeleteBtn = screen.getAllByRole("button", { name: /eliminar simulación/i })[0]!;
    await userEvent.click(firstDeleteBtn);

    expect(await screen.findByRole("button", { name: /confirmar/i })).toBeInTheDocument();
    expect(deleteCount).toBe(0);
  });

  it("SIM.del.3: confirming calls DELETE /me/simulations/{id}", async () => {
    let deleteCount = 0;
    let capturedId: string | undefined;

    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE)),
      http.delete("/api/v1/me/simulations/:id", ({ params }) => {
        deleteCount++;
        capturedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(MemoryRouter, { initialEntries: ["/simulations"] }, children)
      );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper }
    );

    await screen.findByText("Simulación DIURNA 2026-2");

    const firstDeleteBtn = screen.getAllByRole("button", { name: /eliminar simulación/i })[0]!;
    await userEvent.click(firstDeleteBtn);
    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteCount).toBe(1);
    });

    expect(capturedId).toBe("sim-1");
  });

  it("SIM.del.4: cancelling the confirmation sends zero DELETE requests", async () => {
    let deleteCount = 0;

    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE)),
      http.delete("/api/v1/me/simulations/:id", () => {
        deleteCount++;
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");

    const firstDeleteBtn = screen.getAllByRole("button", { name: /eliminar simulación/i })[0]!;
    await userEvent.click(firstDeleteBtn);
    const cancelBtn = await screen.findByRole("button", { name: /cancelar/i });
    await userEvent.click(cancelBtn);

    expect(deleteCount).toBe(0);
    // Original buttons should be visible again
    expect(screen.getAllByRole("button", { name: /eliminar simulación/i })).toHaveLength(2);
  });

  it("SIM.del.5: DELETE error renders an accessible role='alert' message", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE)),
      http.delete("/api/v1/me/simulations/:id", () =>
        HttpResponse.json({ detail: "Error interno del servidor" }, { status: 500 })
      )
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");

    const firstDeleteBtn = screen.getAllByRole("button", { name: /eliminar simulación/i })[0]!;
    await userEvent.click(firstDeleteBtn);
    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("SIM.del.6: confirm strip stays visible while mutation is pending (no premature close)", async () => {
    let resolveDelete!: () => void;
    const deleteStarted = new Promise<void>((res) => {
      resolveDelete = res;
    });

    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE)),
      http.delete("/api/v1/me/simulations/:id", async () => {
        resolveDelete();
        await new Promise<never>(() => { /* never resolves */ });
      })
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");

    const firstDeleteBtn = screen.getAllByRole("button", { name: /eliminar simulación/i })[0]!;
    await userEvent.click(firstDeleteBtn);
    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    await deleteStarted;

    // Confirm button shows "Eliminando..." text while pending
    await waitFor(() => {
      expect(screen.getByText("Eliminando...")).toBeInTheDocument();
    });
    // Cancel button still visible — strip has not closed
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });

  it("SIM.del.7: 'Eliminar' trigger is disabled while mutation is pending", async () => {
    let resolveDelete!: () => void;
    const deleteStarted = new Promise<void>((res) => {
      resolveDelete = res;
    });

    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE)),
      http.delete("/api/v1/me/simulations/:id", async () => {
        resolveDelete();
        await new Promise<never>(() => { /* never resolves */ });
      })
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");

    const firstDeleteBtn = screen.getAllByRole("button", { name: /eliminar simulación/i })[0]!;
    await userEvent.click(firstDeleteBtn);
    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    await deleteStarted;

    // The confirm button shows "Eliminando..." and must be disabled
    await waitFor(() => {
      const pendingBtn = screen.getByText("Eliminando...");
      expect(pendingBtn.closest("button")).toBeDisabled();
    });
  });

  it("SIM.del.8: deleting last simulation shows empty state", async () => {
    const singleSim = {
      content: [SIMULATIONS_FIXTURE.content[0]!],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    // First call returns one sim; after DELETE succeeds, second call returns empty
    let callCount = 0;
    server.use(
      http.get("/api/v1/me/simulations", () => {
        callCount++;
        if (callCount === 1) return HttpResponse.json(singleSim);
        return HttpResponse.json({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
      }),
      http.delete("/api/v1/me/simulations/:id", () =>
        new HttpResponse(null, { status: 204 })
      )
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");

    const deleteBtn = screen.getAllByRole("button", { name: /eliminar simulación/i })[0]!;
    await userEvent.click(deleteBtn);
    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/no tenés simulaciones/i)).toBeInTheDocument();
    });
  });
});
