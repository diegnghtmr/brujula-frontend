/**
 * LogoutButton — calls POST /auth/logout via generated AuthApi,
 * clears the TanStack Query cache, clears the disclaimer session key, then navigates to /login.
 *
 * Logout requires CSRF token in X-XSRF-TOKEN header (handled by axios interceptor).
 * The generated AuthApi.logout() method accepts xXSRFTOKEN as a parameter,
 * but our axios interceptor ALREADY injects it from the cookie — we pass a
 * placeholder to satisfy the generated signature; the interceptor overrides it.
 * After logout: clear query cache + clear disclaimer session key + navigate to /login.
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

function initiateLoginRedirect() {
  window.location.assign("/login");
}

function LogoutButton() {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    try {
      // The interceptor injects X-XSRF-TOKEN from the cookie automatically.
      // The generated client requires the header as a param — pass empty string;
      // the actual value comes from the axios CSRF interceptor.
      await authApi.logout({ xXSRFTOKEN: "" });
    } finally {
      // Clear all cached queries (auth state gone).
      queryClient.clear();
      // Clear disclaimer session key so the banner reappears after re-login
      // in the same tab (banner MUST reappear on next login).
      sessionStorage.removeItem(DISCLAIMER_SESSION_KEY);
      setIsPending(false);
      initiateLoginRedirect();
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
