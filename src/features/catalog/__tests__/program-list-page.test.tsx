/**
 * CAT-001: ProgramListPage
 *
 * Spec scenarios:
 * 1. Renders program name and faculty for each active program (from MSW-mocked GET /programs).
 * 2. Pagination controls render when totalPages > 1.
 * 3. Shows loading spinner while fetching.
 * 4. Shows empty state when no programs returned.
 * 5. Pagination next button advances page (request param verified).
 * 6. Pagination next button re-renders with new page content (DOM verified).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { ProgramListPage } from "@/features/catalog/components/program-list-page";
import { ProgramCard } from "@/features/catalog/components/program-card";

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

const PROGRAM_PAGE_SINGLE = {
  content: [
    {
      id: "prog-1",
      name: "Ingeniería de Sistemas y Computación",
      faculty: "Facultad de Ingeniería",
      status: "ACTIVE",
      availableJourneys: [],
      version: 1,
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const PROGRAM_PAGE_MULTI = {
  content: [
    {
      id: "prog-1",
      name: "Ingeniería de Sistemas y Computación",
      faculty: "Facultad de Ingeniería",
      status: "ACTIVE",
      availableJourneys: [],
      version: 1,
    },
    {
      id: "prog-2",
      name: "Licenciatura en Lenguas Modernas",
      faculty: "Facultad de Educación",
      status: "ACTIVE",
      availableJourneys: [],
      version: 1,
    },
  ],
  page: 0,
  size: 2,
  totalElements: 4,
  totalPages: 2,
};

describe("ProgramListPage (CAT-001)", () => {
  it("renders program name and faculty for each program", async () => {
    server.use(
      http.get("/api/v1/programs", () => HttpResponse.json(PROGRAM_PAGE_SINGLE))
    );

    render(
      <Routes>
        <Route path="/catalog/programs" element={<ProgramListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(
      await screen.findByText("Ingeniería de Sistemas y Computación")
    ).toBeInTheDocument();
    expect(screen.getByText("Facultad de Ingeniería")).toBeInTheDocument();
  });

  it("renders pagination controls when totalPages > 1", async () => {
    server.use(
      http.get("/api/v1/programs", () => HttpResponse.json(PROGRAM_PAGE_MULTI))
    );

    render(
      <Routes>
        <Route path="/catalog/programs" element={<ProgramListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for data to load
    await screen.findByText("Ingeniería de Sistemas y Computación");

    // Pagination controls must be present when totalPages > 1
    expect(screen.getByRole("navigation", { name: /paginación/i })).toBeInTheDocument();
  });

  it("shows loading indicator while fetching", async () => {
    server.use(
      http.get("/api/v1/programs", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(PROGRAM_PAGE_SINGLE);
      })
    );

    render(
      <Routes>
        <Route path="/catalog/programs" element={<ProgramListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when no programs exist", async () => {
    server.use(
      http.get("/api/v1/programs", () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        })
      )
    );

    render(
      <Routes>
        <Route path="/catalog/programs" element={<ProgramListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(
      await screen.findByText(/no hay programas/i)
    ).toBeInTheDocument();
  });

  it("pagination next button advances page", async () => {
    let pageRequested = 0;
    server.use(
      http.get("/api/v1/programs", ({ request }) => {
        const url = new URL(request.url);
        pageRequested = Number(url.searchParams.get("page") ?? "0");
        return HttpResponse.json(PROGRAM_PAGE_MULTI);
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/catalog/programs" element={<ProgramListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas y Computación");
    const nextBtn = screen.getByRole("button", { name: /siguiente/i });
    await user.click(nextBtn);

    await waitFor(() => {
      expect(pageRequested).toBe(1);
    });
  });

  it("pagination next button re-renders with different page content (FIX-7)", async () => {
    const PAGE_1 = {
      content: [
        {
          id: "prog-3",
          name: "Medicina General",
          faculty: "Facultad de Medicina",
          status: "ACTIVE",
          availableJourneys: [],
          version: 1,
        },
      ],
      page: 1,
      size: 2,
      totalElements: 4,
      totalPages: 2,
    };

    server.use(
      http.get("/api/v1/programs", ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get("page") ?? "0";
        return HttpResponse.json(page === "1" ? PAGE_1 : PROGRAM_PAGE_MULTI);
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/catalog/programs" element={<ProgramListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas y Computación");
    const nextBtn = screen.getByRole("button", { name: /siguiente/i });
    await user.click(nextBtn);

    // After clicking next, page-1 content must render and page-0 content must be gone
    await waitFor(() => {
      expect(screen.getByText("Medicina General")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Ingeniería de Sistemas y Computación")
    ).not.toBeInTheDocument();
  });
});

describe("ProgramCard — keyboard accessibility (WCAG 2.1.1)", () => {
  const program = {
    id: "prog-kbd",
    name: "Ingeniería Electrónica",
    faculty: "Facultad de Ingeniería",
    status: "ACTIVE" as const,
    availableJourneys: [],
    version: 1,
  };

  it("fires onSelect when Enter key is pressed on a clickable card", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<ProgramCard program={program} onSelect={onSelect} />);

    const card = screen.getByRole("button", { name: /programa: ingeniería electrónica/i });
    card.focus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith("prog-kbd");
  });

  it("fires onSelect when Space key is pressed on a clickable card", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<ProgramCard program={program} onSelect={onSelect} />);

    const card = screen.getByRole("button", { name: /programa: ingeniería electrónica/i });
    card.focus();
    await user.keyboard(" ");

    expect(onSelect).toHaveBeenCalledWith("prog-kbd");
  });

  it("is keyboard-focusable (native button) when onSelect is provided", () => {
    // WU6 a11y refactor: ProgramCard now renders a native <button> when interactive,
    // so tabindex is implicit (not rendered as an attribute). The element must still
    // be reachable by keyboard — verified by confirming it has the button role.
    render(<ProgramCard program={program} onSelect={() => {}} />);
    const card = screen.getByRole("button", { name: /programa: ingeniería electrónica/i });
    // Native buttons are focusable by default; no explicit tabindex needed
    expect(card.tagName.toLowerCase()).toBe("button");
  });

  it("does not have button role when onSelect is not provided", () => {
    render(<ProgramCard program={program} />);
    // Without onSelect: article is purely presentational — no button role
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
