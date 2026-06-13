/**
 * TermsPage — Términos de uso de Brújula.
 *
 * Public page linked from the registration form.
 */

import { Link } from "react-router";
import { cn } from "@/lib/utils";

function TermsPage() {
  return (
    <main
      className={cn(
        "min-h-screen flex flex-col items-center",
        "bg-background px-6 py-12"
      )}
    >
      <article className="w-full max-w-2xl flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground font-display mb-1">
            Términos de uso
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: 2026
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            1. Descripción del servicio
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Brújula es un planificador curricular de carácter académico desarrollado para
            estudiantes de la Universidad del Quindío. Su propósito es ayudarte a visualizar
            y simular la organización de tu plan de estudios y horarios de manera orientativa.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            2. Información autodeclarada
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Toda la información académica ingresada en Brújula (materias cursadas, notas,
            créditos aprobados, entre otros) es <strong>autodeclarada por el usuario</strong>.
            Esta información no es verificada ni validada automáticamente por la Universidad
            del Quindío. El usuario es el único responsable de la veracidad y exactitud de
            los datos que registre.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            3. Carácter referencial de la simulación
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La simulación de horarios y la organización curricular generada por Brújula
            tienen un carácter <strong>exclusivamente referencial</strong>. No constituye
            matrícula oficial, no garantiza cupos en los grupos mostrados, ni reemplaza
            los procesos institucionales de inscripción y matrícula de la Universidad
            del Quindío. Para cualquier trámite académico oficial, debés acudir directamente
            a los canales institucionales de la universidad.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            4. Uso académico
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Brújula está destinado exclusivamente al uso académico personal de los
            estudiantes de la Universidad del Quindío. Queda prohibido su uso con fines
            comerciales, de reventa o cualquier otro propósito ajeno al planeamiento
            curricular individual.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            5. Limitación de responsabilidad
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La información presentada en Brújula no reemplaza ni tiene mayor jerarquía
            que la información oficial de la Universidad del Quindío. Los planes de
            estudio, requisitos y normativas vigentes son los definidos oficialmente
            por la institución. Brújula no asume responsabilidad por decisiones
            académicas tomadas basándose exclusivamente en la información mostrada
            en la plataforma.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            6. Modificaciones
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Estos términos pueden ser actualizados periódicamente. Al continuar usando
            Brújula después de una actualización, aceptás los nuevos términos. Te
            recomendamos revisar esta sección con regularidad.
          </p>
        </section>

        <footer className="pt-4 border-t border-border">
          <Link
            to="/register"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            ← Volver al registro
          </Link>
        </footer>
      </article>
    </main>
  );
}

export { TermsPage };
