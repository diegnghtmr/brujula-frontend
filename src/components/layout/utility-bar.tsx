/**
 * UtilityBar — top utility strip per DESIGN.md §6.12.
 *
 * Spec: bg-secondary, ~36px tall, small inline cluster, never collapses.
 * Adapted for AUTHENTICATED shell context — "Iniciar sesión" is removed.
 * Authenticated affordances: "Encontrar sede", "Ayuda", and "Mi cuenta".
 *
 * A11Y: the <nav> carries aria-label="Utilidades" — distinct from
 * "Navegación principal" (AppNav) and from the footer column navs.
 * This prevents landmark collision.
 *
 * Styling uses semantic tokens only — no raw palette values.
 */

function UtilityBar() {
  return (
    <div className="bg-secondary rounded-none border-b border-border">
      <div className="mx-auto max-w-screen-xl px-4">
        <nav
          aria-label="Utilidades"
          className="flex items-center justify-end gap-4 h-9"
        >
          <a
            href="#"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
          >
            Encontrar sede
          </a>
          <span aria-hidden="true" className="text-border select-none">·</span>
          <a
            href="#"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
          >
            Ayuda
          </a>
          <span aria-hidden="true" className="text-border select-none">·</span>
          <a
            href="#"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
          >
            Mi cuenta
          </a>
        </nav>
      </div>
    </div>
  );
}

export { UtilityBar };
