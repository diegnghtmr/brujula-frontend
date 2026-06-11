/**
 * S1-G-5: UserProfileCard — renders authenticated user's profile data from /me.
 * Styled via DESIGN tokens only. Light + dark theme support.
 */

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Estudiante",
  STAFF: "Personal",
  ADMIN: "Administrador",
};

function UserProfileCard() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Mi perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            <span className="sr-only">Cargando perfil…</span>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No se pudo cargar el perfil.
          </p>
        </CardContent>
      </Card>
    );
  }

  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Mi perfil</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{user.fullName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {roleLabel}
          </Badge>
          {user.status === "ACTIVE" && (
            <Badge variant="default" className="text-xs">
              Activo
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { UserProfileCard };
