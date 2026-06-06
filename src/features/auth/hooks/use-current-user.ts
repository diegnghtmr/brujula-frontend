/**
 * S1-G-4: useCurrentUser — TanStack Query hook for the authenticated user profile.
 *
 * Design contract (TRD §7 / Design §7):
 * - Backend is the source of auth truth — queries /me via generated ProfileApi.
 * - Zustand is for UI-only state; auth truth lives here via TanStack Query.
 * - 401 response → isError true, isAuthenticated false.
 * - staleTime 60s: /me is stable for the session window.
 */

import { useQuery } from "@tanstack/react-query";
import { ProfileApi } from "@/api/generated/api/profile-api";
import { createApiInstance } from "@/api/client";
import type { CurrentUser } from "@/api/generated/models/current-user";

const profileApi = createApiInstance(ProfileApi);

const CURRENT_USER_QUERY_KEY = ["currentUser"] as const;

function fetchCurrentUser(): Promise<CurrentUser> {
  return profileApi.getCurrentUser().then((res) => res.data);
}

interface UseCurrentUserResult {
  data: CurrentUser | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** True when /me returned data (session active). */
  isAuthenticated: boolean;
}

function useCurrentUser(): UseCurrentUserResult {
  const query = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isAuthenticated: query.isSuccess && query.data !== undefined,
  };
}

export { useCurrentUser, CURRENT_USER_QUERY_KEY };
export type { UseCurrentUserResult };
