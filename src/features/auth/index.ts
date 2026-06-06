/**
 * Auth feature public API.
 * Import from "@/features/auth" for consumers outside this feature.
 */

export { LoginPage, OIDC_LOGIN_URL } from "./components/login-page";
export { LogoutButton } from "./components/logout-button";
export { RequireAuth } from "./components/require-auth";
export { UserProfileCard } from "./components/user-profile-card";
export { DisclaimerBanner } from "./components/disclaimer-banner";
export { useCurrentUser, CURRENT_USER_QUERY_KEY } from "./hooks/use-current-user";
export type { UseCurrentUserResult } from "./hooks/use-current-user";
