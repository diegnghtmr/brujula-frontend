/**
 * UtilityBar — top utility strip per DESIGN.md §6.12.
 *
 * Spec: bg-secondary, ~36px tall, small inline cluster, never collapses.
 * Adapted for AUTHENTICATED shell context.
 *
 * Links:
 * - "Encontrar sede" → https://www.uniquindio.edu.co (external, opens in new tab)
 * - "Ayuda" → https://www.uniquindio.edu.co (external, opens in new tab)
 * "Mi cuenta" was removed: no account/profile page exists and the header
 * already renders a LogoutButton ("Cerrar sesión"), making it redundant.
 *
 * A11Y: the <nav> carries aria-label="Utilidades" — distinct from
 * "Navegación principal" (AppNav) and from the footer column navs.
 * This prevents landmark collision.
 * All external links carry target="_blank" rel="noopener noreferrer".
 *
 * Styling uses semantic tokens only — no raw palette values.
 */

const LINK_CLASS =
  "text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm";

function UtilityBar() {
  return (
    <div className="bg-secondary rounded-none border-b border-border">
      <div className="mx-auto max-w-screen-xl px-4">
        <nav
          aria-label="Utilidades"
          className="flex items-center justify-end gap-4 h-9"
        >
          <a
            href="https://www.uniquindio.edu.co"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Encontrar sede
          </a>
          <span aria-hidden="true" className="text-border select-none">·</span>
          <a
            href="https://www.uniquindio.edu.co"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Ayuda
          </a>
        </nav>
      </div>
    </div>
  );
}

export { UtilityBar };
