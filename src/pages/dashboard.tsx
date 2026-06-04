import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Dashboard — placeholder shell page.
 * Real feature content begins in Fase 1.
 */
function DashboardPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-foreground font-display">
          Brújula — Planificador Curricular
        </h1>
        <ThemeToggle />
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle className="text-base">Scaffold Fase 0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Base de la aplicación lista. La lógica de negocio comienza en Fase 1.
            </p>
            {/* DESIGN §6.13 mandatory disclaimer */}
            <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
              La información académica registrada en esta plataforma es autodeclarada y no
              reemplaza ni certifica la información oficial de la Universidad del Quindío.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export { DashboardPage };
