/**
 * S1-G-6: DisclaimerBanner — persistent, accessible disclaimer banner.
 *
 * Spec (DESIGN §6.13 / Spec Requirement: Disclaimer Banner):
 * - Always visible in authenticated shell until dismissed per session.
 * - Reappears on next login (sessionStorage, not localStorage).
 * - WCAG 2.2 AA: role="region" + aria-label + aria-live="polite", focus-visible, ≥44px touch targets.
 * - Styled via DESIGN tokens only. Light + dark.
 * - Text must be neutral/professional Spanish (product requirement).
 *
 * ARIA note (S-WUD-001 fix): A persistent informational disclaimer is NOT an
 * assertive alert. Using role="alert" carries implicit aria-live="assertive" which
 * interrupts screen readers immediately — inappropriate for a static banner that was
 * already present on load. Changed to role="region" with aria-label + aria-live="polite"
 * so screen readers announce it at the next opportunity, not by interrupting the user.
 *
 * Storage key exported as DISCLAIMER_SESSION_KEY so logout-button.tsx can clear it
 * without duplicating the string (avoids key-drift bugs — W-WUD-002 fix).
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Exported so LogoutButton can clear it on logout (spec: reappear on next login). */
export const DISCLAIMER_SESSION_KEY = "disclaimer-dismissed";

function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(DISCLAIMER_SESSION_KEY) === "true";
  });

  if (dismissed) {
    return null;
  }

  function handleDismiss() {
    sessionStorage.setItem(DISCLAIMER_SESSION_KEY, "true");
    setDismissed(true);
  }

  return (
    <aside
      role="region"
      aria-label="Aviso de descargo de responsabilidad"
      aria-live="polite"
      className={cn(
        "w-full px-4 py-3",
        // §6.13/P1-5: persistent calm notice, not an alert → secondary surface
        "bg-secondary text-secondary-foreground",
        "border-b border-border",
        "flex items-start justify-between gap-4"
      )}
    >
      <p className="text-sm leading-relaxed flex-1">
        <strong className="font-semibold">Aviso:</strong>{" "}
        La información académica registrada en esta plataforma es{" "}
        <strong className="font-semibold">autodeclarada</strong> y no reemplaza
        ni certifica la información oficial de la Universidad del Quindío.
        Esta herramienta es de planificación personal únicamente.
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          "flex-shrink-0 text-sm font-medium underline underline-offset-2",
          "min-h-[44px] min-w-[44px] flex items-center justify-center",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-ring rounded",
          "hover:opacity-80 transition-opacity",
          "motion-reduce:transition-none"
        )}
        aria-label="Cerrar aviso de descargo de responsabilidad"
      >
        Entendido
      </button>
    </aside>
  );
}

export { DisclaimerBanner };
