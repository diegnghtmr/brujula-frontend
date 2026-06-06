/**
 * S1-G-1: LoginPage — landing page that initiates OIDC login.
 *
 * Design contract (Design §7):
 * - Login = full-page redirect to backend OIDC authorization endpoint.
 *   NOT an XHR. Uses window.location.assign for testability (vs href assignment).
 * - The backend origin (same-origin via Vite proxy) handles /oauth2/authorization/keycloak.
 */

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
            Planificador curricular — Universidad del Quindío
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
