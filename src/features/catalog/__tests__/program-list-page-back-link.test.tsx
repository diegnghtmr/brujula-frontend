/**
 * WU-2: BackLink wiring tests for ProgramListPage (hub page).
 *
 * Spec scenario:
 * - ProgramListPage (/catalog/programs) is a hub page that must show a BackLink to /dashboard.
 * - Exactly ONE back affordance.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { ProgramListPage } from "@/features/catalog/components/program-list-page";

const EMPTY_PROGRAM_PAGE = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 1,
};

function createWrapper(initialPath = "/catalog/programs") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries: [initialPath] },
        children
      )
    );
}

describe("ProgramListPage — BackLink (WU-2)", () => {
  it("renders a BackLink pointing to /dashboard", async () => {
    server.use(
      http.get("/api/v1/programs", () => HttpResponse.json(EMPTY_PROGRAM_PAGE))
    );

    render(
      <Routes>
        <Route path="/catalog/programs" element={<ProgramListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    const backLink = screen.getByRole("link", { name: /volver/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/dashboard");
  });

  it("has exactly ONE back affordance (no duplicates)", async () => {
    server.use(
      http.get("/api/v1/programs", () => HttpResponse.json(EMPTY_PROGRAM_PAGE))
    );

    render(
      <Routes>
        <Route path="/catalog/programs" element={<ProgramListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    const backLinks = screen.getAllByRole("link", { name: /volver/i });
    expect(backLinks).toHaveLength(1);
  });
});
