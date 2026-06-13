/**
 * BackLink — reusable back navigation affordance.
 *
 * Props:
 * - `to`: explicit parent route → renders a React Router <Link>.
 * - `label`: visible text (default "Volver").
 * - When `to` is omitted, renders a <button> that calls navigate(-1).
 *
 * Visual: ArrowLeft icon (aria-hidden) + label text.
 * Styling: subtle secondary style using semantic tokens; min 44px hit target.
 * Accessibility: aria-label, keyboard-operable, visible focus ring.
 * NOT a <nav> landmark — plain link or button only.
 */

import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  /** Explicit parent route. When provided, renders a <Link>. */
  to?: string;
  /** Visible label text. Defaults to "Volver". */
  label?: string;
  /** Additional className overrides. */
  className?: string;
}

const BASE_CLASSES = cn(
  // Layout: row, centered, gap
  "inline-flex items-center gap-1.5",
  // Typography: small, secondary color
  "text-sm text-muted-foreground",
  // Interaction
  "hover:text-foreground transition-colors",
  // Focus visible ring (keyboard a11y)
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  // Min 44px hit target height (a11y)
  "min-h-[44px]",
  // No heavy button styling — inline text style
  "rounded-none bg-transparent border-0 p-0 cursor-pointer"
);

function BackLink({ to, label = "Volver", className }: BackLinkProps) {
  const navigate = useNavigate();

  const ariaLabel = label;

  const content = (
    <>
      <ArrowLeft
        aria-hidden="true"
        className="w-4 h-4 shrink-0"
      />
      <span>{label}</span>
    </>
  );

  if (to !== undefined) {
    return (
      <Link
        to={to}
        aria-label={ariaLabel}
        className={cn(BASE_CLASSES, className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => {
        // Guard against empty history on deep-link / fresh load.
        // React Router sets `window.history.state.idx`; idx > 0 means there
        // is a prior SPA entry to go back to. Without this guard, navigate(-1)
        // on idx === 0 exits the app entirely.
        const idx = (window.history.state as { idx?: number } | null)?.idx;
        if (idx !== undefined && idx > 0) {
          navigate(-1);
        } else {
          navigate("/dashboard", { replace: true });
        }
      }}
      className={cn(BASE_CLASSES, className)}
    >
      {content}
    </button>
  );
}

export { BackLink };
