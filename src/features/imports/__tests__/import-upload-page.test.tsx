/**
 * ImportUploadPage — unit + a11y tests (Strict TDD — RED phase)
 *
 * Conventions mirror simulation-create-form.test.tsx:
 * - MSW + RTL + vitest
 * - vitest-axe toHaveNoViolations() for a11y
 * - QueryClient + MemoryRouter wrapper
 * - All IDs from MSW fixtures, nothing hardcoded in component
 *
 * NOTE: WCAG 1.4.3 color-contrast is NOT exercised under jsdom; it is verified by
 * the Playwright e2e sweep (authed-axe-sweep.spec.ts).
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { axe } from "vitest-axe";
import { ImportUploadPage } from "@/features/imports/components/import-upload-page";

// ── MSW fixture constants ────────────────────────────────────────────────────

const PROGRAM_ID = "11111111-0000-4000-a000-000000000001";
const BATCH_ID = "aaaaaaaa-0000-4000-a000-000000000001";

const PROGRAMS_FIXTURE = [
  { id: PROGRAM_ID, name: "Ingeniería de Sistemas y Computación", faculty: "Facultad de Ingeniería", status: "ACTIVE", version: 0 },
];

const IMPORT_CREATED = {
  id: BATCH_ID,
  kind: "OFFERINGS",
  programId: PROGRAM_ID,
  status: "PENDING",
  uploadedAt: "2026-01-01T00:00:00Z",
  version: 0,
};

// ── Wrapper factory ──────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: ["/imports/upload"] }, children)
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <Routes>
      <Route path="/imports/upload" element={<ImportUploadPage />} />
      <Route path="/imports/:batchId" element={<div data-testid="import-detail">Detail</div>} />
    </Routes>,
    { wrapper: createWrapper() }
  );
}

function makeCsvFile(name = "test.csv") {
  return new File(["col1,col2\nval1,val2"], name, { type: "text/csv" });
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe("ImportUploadPage", () => {
  // ── 1. Renders form ────────────────────────────────────────────────────────
  it("renders the import form with heading and fields", async () => {
    server.use(
      http.get("/api/v1/programs", () =>
        HttpResponse.json({ content: PROGRAMS_FIXTURE, totalElements: 1, totalPages: 1, size: 100, number: 0 })
      )
    );

    renderPage();

    // Heading
    expect(await screen.findByRole("heading", { name: /importar datos académicos/i })).toBeInTheDocument();

    // Kind select — labelled "Tipo de importación"
    expect(await screen.findByRole("combobox", { name: /tipo de importación/i })).toBeInTheDocument();

    // File input — labelled "Archivo CSV"
    expect(screen.getByLabelText(/archivo csv/i)).toBeInTheDocument();
  });

  // ── 2. Validation: submit disabled without required fields ─────────────────
  it("submit button is disabled when no fields are filled (mode: onChange)", async () => {
    server.use(
      http.get("/api/v1/programs", () =>
        HttpResponse.json({ content: PROGRAMS_FIXTURE, totalElements: 1, totalPages: 1, size: 100, number: 0 })
      )
    );

    renderPage();

    await screen.findByRole("heading", { name: /importar datos académicos/i });

    const submitBtn = screen.getByRole("button", { name: /subir archivo/i });
    // No file, no kind, no program → disabled via !isValid (mode: onChange)
    expect(submitBtn).toBeDisabled();
  });

  it("submit button is still disabled when only file is selected (kind and program missing)", async () => {
    server.use(
      http.get("/api/v1/programs", () =>
        HttpResponse.json({ content: PROGRAMS_FIXTURE, totalElements: 1, totalPages: 1, size: 100, number: 0 })
      )
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: /importar datos académicos/i });

    const fileInput = screen.getByLabelText(/archivo csv/i);
    await user.upload(fileInput, makeCsvFile());

    // File present but kind + program not selected → still disabled (isValid = false)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /subir archivo/i })).toBeDisabled();
    });
  });

  // ── 3. Successful upload calls mutation and navigates ─────────────────────
  it("successful upload navigates to import detail page", async () => {
    let uploadCalled = false;

    server.use(
      http.get("/api/v1/programs", () =>
        HttpResponse.json({ content: PROGRAMS_FIXTURE, totalElements: 1, totalPages: 1, size: 100, number: 0 })
      ),
      http.post("/api/v1/staff/imports", () => {
        uploadCalled = true;
        return HttpResponse.json(IMPORT_CREATED, { status: 202 });
      })
    );

    const user = userEvent.setup();
    renderPage();

    // Wait for program dropdown to load
    const programSelect = await screen.findByRole("combobox", { name: /programa académico/i });
    expect(programSelect).toBeInTheDocument();

    // Select import kind
    await user.selectOptions(
      screen.getByRole("combobox", { name: /tipo de importación/i }),
      "OFFERINGS"
    );

    // Select program
    await user.selectOptions(programSelect, PROGRAM_ID);

    // Upload file
    const fileInput = screen.getByLabelText(/archivo csv/i);
    await user.upload(fileInput, makeCsvFile());

    // Submit button should now be enabled
    const submitBtn = screen.getByRole("button", { name: /subir archivo/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    // Submit
    await user.click(submitBtn);

    await waitFor(() => {
      expect(uploadCalled).toBe(true);
      expect(screen.getByTestId("import-detail")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  // ── 4. a11y: no violations ──────────────────────────────────────────────
  // NOTE: WCAG 1.4.3 color-contrast is NOT exercised under jsdom; it is verified
  // by the Playwright e2e sweep (authed-axe-sweep.spec.ts).
  it("has no accessibility violations on initial render", async () => {
    server.use(
      http.get("/api/v1/programs", () =>
        HttpResponse.json({ content: PROGRAMS_FIXTURE, totalElements: 1, totalPages: 1, size: 100, number: 0 })
      )
    );

    const { container } = renderPage();

    await screen.findByRole("heading", { name: /importar datos académicos/i });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
