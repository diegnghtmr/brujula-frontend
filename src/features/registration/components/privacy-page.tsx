/**
 * PrivacyPage — Tratamiento de datos personales.
 *
 * Aligned with Colombia's Ley 1581 de 2012 (Habeas Data).
 * Public page linked from the registration form.
 */

import { Link } from "react-router";
import { cn } from "@/lib/utils";

function PrivacyPage() {
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
            Tratamiento de datos personales
          </h1>
          <p className="text-sm text-muted-foreground">
            En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Colombia)
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            1. Responsable del tratamiento
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La Universidad del Quindío, a través del proyecto académico Brújula, actúa
            como responsable del tratamiento de los datos personales recolectados en
            esta plataforma.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            2. Datos que se recolectan
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Brújula recolecta los siguientes datos personales:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-1 ml-2">
            <li>Correo electrónico institucional</li>
            <li>Nombre completo</li>
            <li>Programa académico al que pertenece el estudiante</li>
            <li>Información académica autodeclarada: materias cursadas, notas y avance curricular</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            3. Finalidad del tratamiento
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Los datos recolectados se utilizan exclusivamente con las siguientes finalidades:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-1 ml-2">
            <li>Autenticación y gestión de la cuenta del usuario en Brújula</li>
            <li>Planeación curricular y simulación de horarios académicos</li>
            <li>Mejora de la experiencia dentro de la plataforma</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            4. Compartición de datos con terceros
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Los datos personales registrados en Brújula <strong>no se comparten con terceros</strong>,
            salvo cuando exista una obligación legal que lo exija o una orden de autoridad
            competente.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            5. Derechos del titular
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            De conformidad con la Ley 1581 de 2012, como titular de tus datos personales
            tenés los siguientes derechos:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-1 ml-2">
            <li><strong>Conocer</strong> los datos personales que Brújula tiene sobre vos</li>
            <li><strong>Actualizar</strong> y <strong>rectificar</strong> la información inexacta o incompleta</li>
            <li><strong>Solicitar la supresión</strong> de tus datos cuando consideres que no son necesarios para las finalidades declaradas o que se está haciendo un uso contrario a la ley</li>
            <li><strong>Revocar la autorización</strong> otorgada para el tratamiento de tus datos personales</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para ejercer cualquiera de estos derechos, podés comunicarte con la Universidad
            del Quindío a través de los canales institucionales disponibles.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            6. Información autodeclarada
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La información académica ingresada en Brújula es autodeclarada por el usuario
            y no es verificada automáticamente. La Universidad del Quindío no es responsable
            por la exactitud de los datos que el usuario registre voluntariamente.
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

export { PrivacyPage };
