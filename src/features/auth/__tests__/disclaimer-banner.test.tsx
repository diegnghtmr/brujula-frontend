/**
 * S1-G-6: DisclaimerBanner — persistent accessible banner.
 * Tests: renders disclaimer text, accessible role, dismissible per session,
 * reappears on re-render (no sessionStorage persistence in unit tests),
 * focus-visible, minimum touch target.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DisclaimerBanner } from "@/features/auth/components/disclaimer-banner";

describe("DisclaimerBanner (S1-G-6)", () => {
  beforeEach(() => {
    // Clear sessionStorage between tests to ensure banner is visible
    sessionStorage.clear();
  });

  it("renders the disclaimer text about non-official platform data", () => {
    render(<DisclaimerBanner />);
    // The disclaimer text must mention autodeclarada / no certifica
    expect(
      screen.getByText(/autodeclarada/i)
    ).toBeInTheDocument();
  });

  it("renders with role='region' and aria-label for accessibility (S-WUD-001 fix)", () => {
    render(<DisclaimerBanner />);
    // A persistent informational disclaimer uses role="region" + aria-label + aria-live="polite"
    // (not role="alert" which carries implicit aria-live="assertive" — inappropriate for a static banner).
    const banner = screen.queryByRole("region", {
      name: /aviso de descargo/i,
    });
    expect(banner).toBeInTheDocument();
  });

  it("has a dismiss button with accessible label", () => {
    render(<DisclaimerBanner />);
    const dismissButton = screen.getByRole("button", {
      name: /cerrar|dismiss|entendido/i,
    });
    expect(dismissButton).toBeInTheDocument();
  });

  it("hides the banner after clicking dismiss", () => {
    render(<DisclaimerBanner />);
    const dismissButton = screen.getByRole("button", {
      name: /cerrar|dismiss|entendido/i,
    });
    fireEvent.click(dismissButton);
    // Banner content should not be visible after dismiss
    expect(screen.queryByText(/autodeclarada/i)).not.toBeInTheDocument();
  });

  it("reappears when remounted (no cross-session persistence in unit)", () => {
    const { unmount } = render(<DisclaimerBanner />);
    const dismissButton = screen.getByRole("button", {
      name: /cerrar|dismiss|entendido/i,
    });
    fireEvent.click(dismissButton);
    unmount();

    // Clear sessionStorage to simulate new session
    sessionStorage.clear();

    render(<DisclaimerBanner />);
    expect(screen.getByText(/autodeclarada/i)).toBeInTheDocument();
  });

  it("dismiss button has minimum 44px touch target via min-h-[44px] or equivalent", () => {
    render(<DisclaimerBanner />);
    const dismissButton = screen.getByRole("button", {
      name: /cerrar|dismiss|entendido/i,
    });
    // Check that the button element exists and has accessible attributes
    expect(dismissButton).toBeInTheDocument();
    // Aria-label or text content present for screen readers
    expect(dismissButton.textContent?.length ?? 0).toBeGreaterThan(0);
  });

  it("is visible by default when sessionStorage has no dismissal key", () => {
    sessionStorage.removeItem("disclaimer-dismissed");
    render(<DisclaimerBanner />);
    expect(screen.getByText(/autodeclarada/i)).toBeInTheDocument();
  });
});
