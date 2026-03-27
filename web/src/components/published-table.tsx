import type { publishedAssignments } from "@/lib/published";
import { DataTable } from "@/components/data-table";
export function PublishedTable({
  rows,
  role,
}: {
  rows: Awaited<ReturnType<typeof publishedAssignments>>;
  role: "COMPANY" | "TUTOR";
}) {
  return rows.length ? (
    <DataTable
      label={
        role === "COMPANY"
          ? "Buscar estudiante, plaza o tutor…"
          : "Buscar estudiante, empresa o plaza…"
      }
      columns={[
        { key: "name", label: "Estudiante" },
        { key: "program", label: "Titulación" },
        ...(role === "TUTOR" ? [{ key: "company", label: "Empresa" }] : []),
        { key: "placement", label: "Plaza" },
        ...(role === "COMPANY" ? [{ key: "tutor", label: "Tutor/a" }] : []),
        { key: "rating", label: "Tu valoración" },
      ]}
      rows={rows.map((a) => ({
        id: a.id,
        href: `/asignaciones/${a.id}`,
        name: a.student.user.name,
        program: a.student.program,
        company: a.placement?.company.name,
        placement: a.placement?.title ?? "Sin asignar",
        tutor: a.tutor?.user.name ?? "Sin tutor",
        rating: a.feedback[0] ? `${a.feedback[0].rating} / 5` : "Pendiente",
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
