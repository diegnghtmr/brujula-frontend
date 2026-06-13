/**
 * LoginPage — landing page that initiates OIDC login.
 *
 * Login = full-page redirect to backend OIDC authorization endpoint.
 * NOT an XHR. Uses window.location.assign for testability (vs href assignment).
 * The backend origin (same-origin via Vite proxy) handles /oauth2/authorization/keycloak.
 */

import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OIDC_LOGIN_URL = "/oauth2/authorization/keycloak";

function initiateLogin() {
  window.location.assign(OIDC_LOGIN_URL);
}

function LoginPage() {
  return (
    <main
      className={cn(
        "min-h-screen flex flex-col items-center justify-center",
        "bg-background"
      )}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-8 px-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-foreground font-display mb-2">
            Brújula
          </h1>
          <p className="text-sm text-muted-foreground">
            Planificador curricular de la Universidad del Quindío
          </p>
        </header>

        <section className="w-full flex flex-col gap-4">
          <Button
            onClick={initiateLogin}
            className="w-full min-h-[44px]"
            size="lg"
          >
            Iniciar sesión
          </Button>
        </section>

        <nav
          className="w-full flex flex-col items-center gap-2 text-sm"
          aria-label="Accesos rápidos"
        >
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/register">Registrarse</Link>
          </Button>
          <Link
            to="/forgot-password"
            className={cn(
              "text-muted-foreground underline-offset-4 hover:underline hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "min-h-[44px] inline-flex items-center"
            )}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </nav>

        <footer>
          <p className="text-xs text-muted-foreground text-center">
            La información registrada es autodeclarada y no reemplaza la
            información oficial de la Universidad del Quindío.
          </p>
        </footer>
      </div>
    </main>
  );
}

export { LoginPage, OIDC_LOGIN_URL };
