import { requireRole } from "@/lib/session";
import { publishedAssignments } from "@/lib/published";
import { PageHeading } from "@/components/page-heading";
import { PublishedTable } from "@/components/published-table";
import { db } from "@/lib/db";
import Link from "next/link";
export default async function StudentsPage() {
  const { user } = await requireRole("TUTOR");
  const rows = await publishedAssignments(user.id, "TUTOR");
  const tutor = await db.tutor.findUniqueOrThrow({
    where: { userId: user.id },
  });
  return (
    <>
      <PageHeading
        title="Mis estudiantes"
        description="Consulta el alumnado que acompañas y sus centros de prácticas."
      />
      <p className="panel mb-6 text-sm">
        Acompañas a <strong>{rows.length} estudiantes</strong> en{" "}
        {new Set(rows.map((r) => r.placementId)).size} centros. Tu capacidad
        actual es de {tutor.maxStudents}.{" "}
        <Link className="text-primary underline" href="/opciones/perfil">
          Actualizar disponibilidad
        </Link>
      </p>
      <PublishedTable rows={rows} role="TUTOR" />
    </>
  );
}
