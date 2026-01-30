import Link from "next/link";
import { FeedbackForm } from "@/components/feedback-form";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, UserRound } from "lucide-react";
import { requireRole } from "@/lib/session";
import { publishedAssignments } from "@/lib/published";
import { PageHeading } from "@/components/page-heading";
export default async function MyAssignmentPage() {
  const { user } = await requireRole("STUDENT");
  const [assignment] = await publishedAssignments(user.id, "STUDENT");
  return (
    <>
      <PageHeading
        title="Mi asignación"
        description="Tu próximo paso, con toda la información en un solo lugar."
      >
        {assignment && (
          <Button asChild variant="outline">
            <Link href={`/asignaciones/${assignment.id}`}>
              Detalles y contactos
            </Link>
          </Button>
        )}
      </PageHeading>
      {assignment?.placement ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="panel lg:col-span-2">
            <p className="eyebrow">Asignación publicada</p>
            <Building2 className="mb-5 text-primary" size={30} />
            <h2 className="text-2xl font-semibold">
              {assignment.placement.title}
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              {assignment.placement.company.name}
            </p>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={16} />
              {assignment.placement.address}
            </p>
            {assignment.distanceKm !== null && (
              <p className="mt-3 text-xs text-muted-foreground">
                {assignment.distanceKm.toFixed(1)} km en línea recta desde tu
                ubicación.
              </p>
            )}
          </section>
          <section className="panel">
            <UserRound className="mb-5 text-primary" size={26} />
            <p className="text-xs text-muted-foreground">
              Tu tutor/a académico/a
            </p>
            <h2 className="mt-3 text-lg font-semibold">
              {assignment.tutor?.user.name ?? "Pendiente de asignar"}
            </h2>
            {assignment.tutor && (
              <a
                className="mt-3 block break-all text-sm text-primary underline"
                href={`mailto:${assignment.tutor.user.email}`}
              >
                {assignment.tutor.user.email}
              </a>
            )}
            <p className="mt-6 text-sm leading-6 text-muted-foreground">
              Tu persona de referencia para acompañarte durante las prácticas.
            </p>
          </section>
        </div>
      ) : (
        <div className="panel max-w-2xl py-10">
          <h2 className="text-xl font-semibold">
            {assignment
              ? "Pendiente de una plaza"
              : "Tu asignación está en camino"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {assignment
              ? "La propuesta publicada todavía no incluye una plaza para ti. Contacta con coordinación para revisar las opciones."
              : "Coordinación está preparando las asignaciones. Recibirás una notificación cuando se publique tu propuesta."}
          </p>
        </div>
      )}
      {assignment && (
        <div className="mt-6">
          <FeedbackForm
            assignmentId={assignment.id}
            initial={assignment.feedback[0]}
          />
        </div>
      )}
      <p className="mt-6 text-sm">
        <Link className="text-primary underline" href="/preferencias">
          Revisar mis preferencias y competencias
        </Link>
      </p>
    </>
  );
}
