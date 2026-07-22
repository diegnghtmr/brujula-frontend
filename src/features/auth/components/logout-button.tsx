/**
 * LogoutButton — calls POST /auth/logout via generated AuthApi, clears the TanStack Query cache,
 * clears the disclaimer session key, then redirects the browser.
 *
 * RP-initiated (single) logout: the backend is the OIDC Relying Party, so a local-only logout lets
 * Keycloak silently re-authenticate the user via SSO. On success the backend returns the Keycloak
 * end_session URL in the `X-Logout-Redirect` response header (status stays 204). When present we
 * navigate there so Keycloak ends the SSO session and then redirects back to /login. When absent
 * (or on failure) we fall back to a local /login navigation.
 *
 * Logout requires CSRF token in X-XSRF-TOKEN header (handled by axios interceptor).
 * The generated AuthApi.logout() method accepts xXSRFTOKEN as a parameter,
 * but our axios interceptor ALREADY injects it from the cookie — we pass a
 * placeholder to satisfy the generated signature; the interceptor overrides it.
 *
 * Disclaimer banner MUST reappear on next login.
 * sessionStorage survives same-tab logout+re-login, so we MUST explicitly clear
 * DISCLAIMER_SESSION_KEY here. Using the exported constant avoids key-drift if the
 * key name is ever changed.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthApi } from "@/api/generated/api/auth-api";
import { createApiInstance } from "@/api/client";
import { Button } from "@/components/ui/button";
import { DISCLAIMER_SESSION_KEY } from "@/features/auth/components/disclaimer-banner";

const authApi = createApiInstance(AuthApi);

/** Response header carrying the Keycloak end_session URL (see backend SecurityConfiguration). */
const LOGOUT_REDIRECT_HEADER = "x-logout-redirect";

const LOGIN_PATH = "/login";

function LogoutButton() {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    // Default to a local /login navigation; upgraded to the Keycloak end_session URL when the
    // backend supplies the X-Logout-Redirect header on a successful logout.
    let redirectTarget = LOGIN_PATH;
    try {
      // The interceptor injects X-XSRF-TOKEN from the cookie automatically.
      // The generated client requires the header as a param — pass empty string;
      // the actual value comes from the axios CSRF interceptor.
      const response = await authApi.logout({ xXSRFTOKEN: "" });
      const headerRedirect = response.headers[LOGOUT_REDIRECT_HEADER];
      if (typeof headerRedirect === "string" && headerRedirect.length > 0) {
        redirectTarget = headerRedirect;
      }
    } catch {
      // Logout request failed (network / 5xx). Proceed to the local /login anyway — the user must
      // not be stranded on an authenticated screen. redirectTarget stays "/login".
    } finally {
      // Clear all cached queries (auth state gone).
      queryClient.clear();
      // Clear disclaimer session key so the banner reappears after re-login
      // in the same tab (banner MUST reappear on next login).
      sessionStorage.removeItem(DISCLAIMER_SESSION_KEY);
      setIsPending(false);
      window.location.assign(redirectTarget);
    }
  }

  return (
    <Button
      onClick={handleLogout}
      disabled={isPending}
      variant="outline"
      size="sm"
      className="min-h-[44px]"
    >
      {isPending ? "Cerrando sesión..." : "Cerrar sesión"}
    </Button>
  );
}

export { LogoutButton };
