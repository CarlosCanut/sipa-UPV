import { requireRole } from "@/lib/session";
import { publishedAssignments } from "@/lib/published";
import { PageHeading } from "@/components/page-heading";
import { PublishedTable } from "@/components/published-table";
export default async function AssignedPage() {
  const { user } = await requireRole("COMPANY");
  const rows = await publishedAssignments(user.id, "COMPANY");
  return (
    <>
      <PageHeading
        title="Alumnado asignado"
        description="Conoce a los estudiantes que realizarán sus prácticas en tu empresa."
      />
      <PublishedTable rows={rows} role="COMPANY" />
    </>
  );
}
