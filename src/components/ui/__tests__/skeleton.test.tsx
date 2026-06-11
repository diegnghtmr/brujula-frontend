/**
 * Skeleton UI primitive — unit tests (DESIGN §6.15).
 *
 * Scenarios:
 * 1. Renders a <div> element.
 * 2. Applies `bg-muted` class.
 * 3. Applies `animate-pulse` class.
 * 4. Applies `motion-reduce:animate-none` class.
 * 5. Merges additional className overrides.
 * 6. Is aria-hidden by default (decorative; a11y announcement is on wrapping role="status").
 * 7. Forwards extra HTML props (e.g. data-testid).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders a div element", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.nodeName).toBe("DIV");
  });

  it("applies bg-muted class", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-muted");
  });

  it("applies animate-pulse class", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
  });

  it("applies motion-reduce:animate-none class", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("motion-reduce:animate-none");
  });

  it("merges additional className overrides", () => {
    const { container } = render(<Skeleton className="h-4 w-48" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-48");
    // Base classes still present
    expect(el.className).toContain("bg-muted");
  });

  it("is aria-hidden by default (decorative element)", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("forwards extra HTML props such as data-testid", () => {
    render(<Skeleton data-testid="my-skeleton" />);
    expect(screen.getByTestId("my-skeleton")).toBeInTheDocument();
  });
});
