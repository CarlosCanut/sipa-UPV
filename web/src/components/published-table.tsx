import type { publishedAssignments } from "@/lib/published";
import { DataTable } from "@/components/data-table";
export function PublishedTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof publishedAssignments>>;
}) {
  return rows.length ? (
    <DataTable
      columns={[
        { key: "name", label: "Estudiante" },
        { key: "program", label: "Titulación" },
        { key: "company", label: "Empresa" },
        { key: "placement", label: "Plaza" },
        { key: "tutor", label: "Tutor/a" },
      ]}
      rows={rows.map((a) => ({
        id: a.id,
        name: a.student.user.name,
        program: a.student.program,
        company: a.placement?.company.name,
        placement: a.placement?.title ?? "Sin asignar",
        tutor: a.tutor?.user.name ?? "Sin tutor",
      }))}
    />
  ) : (
    <div className="panel py-12 text-center">
      <h2 className="text-lg font-semibold">Aún no tienes alumnado asignado</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Aquí aparecerán las asignaciones cuando coordinación publique una
        propuesta para ti.
      </p>
    </div>
  );
}
