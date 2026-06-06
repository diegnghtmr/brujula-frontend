import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserProfileCard } from "@/features/auth/components/user-profile-card";

/**
 * Dashboard — authenticated home page.
 * Wrapped by AuthenticatedShell (provides disclaimer banner + header).
 */
function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground font-display mb-8">
        Inicio
      </h1>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* User profile from /me */}
        <UserProfileCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado del progreso</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="aprobada" showIcon>Aprobada</Badge>
            <Badge variant="en-curso" showIcon>En curso</Badge>
            <Badge variant="cancelada" showIcon>Cancelada</Badge>
            <Badge variant="reprobada" showIcon>Reprobada</Badge>
            <Badge variant="pendiente" showIcon>Pendiente</Badge>
            <Badge variant="habilitada" showIcon>Habilitada</Badge>
            <Badge variant="bloqueada" showIcon>Bloqueada</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fase 1 — Seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Autenticación OIDC activa. La lógica académica comienza en Fase 2.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export { DashboardPage };
