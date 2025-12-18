import { requireRole } from "@/lib/session";
import { publishedAssignments } from "@/lib/published";
import { PageHeading } from "@/components/page-heading";
import { PublishedTable } from "@/components/published-table";
export default async function StudentsPage() {
  const { user } = await requireRole("TUTOR");
  const rows = await publishedAssignments(user.id, "TUTOR");
  return (
    <>
      <PageHeading
        title="Mis estudiantes"
        description="Consulta el alumnado que acompañas y sus centros de prácticas."
      />
      <PublishedTable rows={rows} />
    </>
  );
}
