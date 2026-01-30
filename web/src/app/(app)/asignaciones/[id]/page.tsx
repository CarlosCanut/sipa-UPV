import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { assignmentScope } from "@/lib/assignment-scope";
import { roleHome } from "@/lib/roles";
import { PageHeading } from "@/components/page-heading";
import { FeedbackForm } from "@/components/feedback-form";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole();
  const { id } = await params;
  const actor = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const assignment = await db.assignment.findFirst({
    where: {
      id,
      ...assignmentScope(actor),
      ...(user.role === "ADMIN"
        ? {}
        : { simulation: { publishedAt: { not: null } } }),
    },
    include: {
      student: { include: { user: true } },
      tutor: { include: { user: true } },
      placement: {
        include: {
          company: {
            include: { users: { select: { name: true, email: true } } },
          },
        },
      },
      simulation: true,
      feedback: { where: { userId: user.id } },
    },
  });
  if (!assignment) notFound();
  const { student, placement, tutor, simulation } = assignment;
  return (
    <>
      <Link
        href={
          user.role === "ADMIN"
            ? `/simulaciones/${simulation.id}`
            : roleHome[user.role]
        }
        className="mb-6 inline-block text-sm text-primary hover:underline"
      >
        ← Volver a asignaciones
      </Link>
      <PageHeading
        title={student.user.name}
        description={`${student.program ?? "Estudiante"} · ${simulation.name}`}
      />
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <section className="panel space-y-3">
          <p className="eyebrow">Centro de prácticas</p>
          <h2 className="text-lg font-semibold">
            {placement?.title ?? "Sin plaza asignada"}
          </h2>
          <p className="text-sm">{placement?.company.name}</p>
          <p className="hint">{placement?.address}</p>
          {assignment.distanceKm != null && (
            <p className="hint">
              {assignment.distanceKm.toFixed(1)} km en línea recta desde la
              ubicación del estudiante.
            </p>
          )}
          {placement?.description && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {placement.description}
            </p>
          )}
        </section>
        <section className="panel space-y-4">
          <h2 className="font-semibold">Personas de contacto</h2>
          <Contact
            label="Estudiante"
            name={student.user.name}
            email={student.user.email}
          />
          {tutor ? (
            <Contact
              label="Tutor/a académico/a"
              name={tutor.user.name}
              email={tutor.user.email}
            />
          ) : (
            <p className="hint">Tutor/a pendiente de asignación.</p>
          )}
          {placement?.company.users.map((u) => (
            <Contact
              key={u.email}
              label="Empresa"
              name={u.name}
              email={u.email}
            />
          ))}
        </section>
      </div>
      {user.role !== "ADMIN" && (
        <FeedbackForm assignmentId={id} initial={assignment.feedback[0]} />
      )}
    </>
  );
}
function Contact({
  label,
  name,
  email,
}: {
  label: string;
  name: string;
  email: string;
}) {
  return (
    <div>
      <p className="hint">{label}</p>
      <p className="text-sm font-medium">{name}</p>
      <a
        className="break-all text-sm text-primary underline"
        href={`mailto:${email}`}
      >
        {email}
      </a>
    </div>
  );
}
