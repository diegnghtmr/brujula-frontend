/**
 * AppFooter — four-column footer per DESIGN.md §6.14.
 *
 * Layout: bg-background, 1px top border, four nav columns
 * (Recursos / Ayuda / Institución / Acerca de), and a fine-print
 * utility-xs row below a divider.
 *
 * A11Y: each column is a <nav> with a DISTINCT aria-label that does NOT
 * collide with the "Navegación principal" landmark in AppNav or the
 * "Utilidades" landmark in UtilityBar.
 *
 * Styling uses semantic tokens only — no raw palette values.
 *
 * Link strategy (WU-1 Fix A):
 * - App-internal routes → React Router <Link> (no full-page reload)
 * - External URLs / institutional → <a target="_blank" rel="noopener noreferrer">
 * - Support email → <a href="mailto:...">
 * - "Versión 1.0" is informational plain text, NOT a link
 */

import { Link } from "react-router";

const UQ_URL = "https://www.uniquindio.edu.co";
const SUPPORT_EMAIL = "mailto:soporte@uniquindio.edu.co";

const LINK_CLASS =
  "text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm";

// ---------------------------------------------------------------------------
// Column definitions — typed union to distinguish link kinds
// ---------------------------------------------------------------------------

type InternalLink = { kind: "internal"; label: string; to: string };
type ExternalLink = { kind: "external"; label: string; href: string };
type MailtoLink = { kind: "mailto"; label: string; href: string };
type PlainText = { kind: "text"; label: string };

type FooterItem = InternalLink | ExternalLink | MailtoLink | PlainText;

interface FooterColumn {
  id: string;
  heading: string;
  ariaLabel: string;
  items: FooterItem[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    id: "recursos",
    heading: "Recursos",
    ariaLabel: "Pie de página — Recursos",
    items: [
      { kind: "internal", label: "Catálogo de asignaturas", to: "/catalog/programs" },
      { kind: "internal", label: "Simulador de matrícula", to: "/simulations" },
      {
        kind: "internal",
        label: "Malla curricular",
        to: "/progress/subscriptions",
      },
      {
        kind: "internal",
        label: "Calculadora de promedio",
        to: "/progress/subscriptions",
      },
    ],
  },
  {
    id: "ayuda",
    heading: "Ayuda",
    ariaLabel: "Pie de página — Ayuda",
    items: [
      { kind: "external", label: "Preguntas frecuentes", href: UQ_URL },
      { kind: "external", label: "Guía de uso", href: UQ_URL },
      { kind: "mailto", label: "Reportar un problema", href: SUPPORT_EMAIL },
      { kind: "mailto", label: "Contacto soporte", href: SUPPORT_EMAIL },
    ],
  },
  {
    id: "institucion",
    heading: "Institución",
    ariaLabel: "Pie de página — Institución",
    items: [
      { kind: "external", label: "Universidad del Quindío", href: UQ_URL },
      { kind: "external", label: "Portal estudiantil", href: UQ_URL },
      { kind: "external", label: "Registro académico", href: UQ_URL },
      { kind: "external", label: "Sede principal", href: UQ_URL },
    ],
  },
  {
    id: "acerca-de",
    heading: "Acerca de",
    ariaLabel: "Pie de página — Acerca de",
    items: [
      { kind: "external", label: "Sobre Brújula", href: UQ_URL },
      { kind: "external", label: "Términos de uso", href: UQ_URL },
      { kind: "external", label: "Política de privacidad", href: UQ_URL },
      // "Versión 1.0" is informational — plain text, NOT a link
      { kind: "text", label: "Versión 1.0" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Item renderer
// ---------------------------------------------------------------------------

function FooterItemRenderer({ item }: { item: FooterItem }) {
  if (item.kind === "internal") {
    return (
      <Link to={item.to} className={LINK_CLASS}>
        {item.label}
      </Link>
    );
  }

  if (item.kind === "external") {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        {item.label}
      </a>
    );
  }

  if (item.kind === "mailto") {
    return (
      <a href={item.href} className={LINK_CLASS}>
        {item.label}
      </a>
    );
  }

  // kind === "text" — plain informational text, no anchor
  return (
    <span className="text-xs text-muted-foreground">{item.label}</span>
  );
}

// ---------------------------------------------------------------------------
// AppFooter
// ---------------------------------------------------------------------------

function AppFooter() {
  return (
    <footer className="bg-background border-t border-border rounded-none">
      {/* Four-column grid */}
      <div className="mx-auto max-w-screen-xl px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.id} aria-label={column.ariaLabel}>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              {column.heading}
            </h2>
            <ul className="flex flex-col gap-2">
              {column.items.map((item) => (
                <li key={item.label}>
                  <FooterItemRenderer item={item} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Fine-print row — utility-xs */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-screen-xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
            © {new Date().getFullYear()} Universidad del Quindío — Brújula. Herramienta de planeación curricular.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={UQ_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
            >
              Términos
            </a>
            <a
              href={UQ_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
            >
              Privacidad
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { AppFooter };
