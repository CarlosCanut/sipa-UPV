import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeading } from "@/components/page-heading";
import { DataTable, type TableRowData } from "@/components/data-table";
const tabs = [
  { key: "estudiantes", label: "Estudiantes" },
  { key: "plazas", label: "Plazas" },
  { key: "tutores", label: "Tutores" },
  { key: "empresas", label: "Empresas" },
];
export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole("ADMIN");
  const requested = (await searchParams).tab;
  const tab = tabs.some((t) => t.key === requested) ? requested : "estudiantes";
  let columns: { key: string; label: string }[];
  let rows: TableRowData[];
  switch (tab) {
    case "plazas": {
      columns = [
        { key: "name", label: "Plaza" },
        { key: "company", label: "Empresa" },
        { key: "seats", label: "Capacidad" },
        { key: "form", label: "Formulario" },
        { key: "active", label: "Estado" },
      ];
      rows = (
        await db.placement.findMany({
          include: { company: true, competencyForm: true },
          orderBy: { title: "asc" },
        })
      ).map((p) => ({
        id: p.id,
        href: `/plazas/${p.id}`,
        name: p.title,
        company: p.company.name,
        seats: p.seats,
        form: p.competencyForm.name,
        active: p.active ? "Activa" : "Inactiva",
      }));
      break;
    }
    case "tutores": {
      columns = [
        { key: "name", label: "Tutor/a" },
        { key: "email", label: "Correo" },
        { key: "department", label: "Departamento" },
        { key: "capacity", label: "Capacidad" },
      ];
      rows = (
        await db.tutor.findMany({
          include: { user: true },
          orderBy: { user: { name: "asc" } },
        })
      ).map((t) => ({
        id: t.id,
        href: `/datos/tutores/${t.id}`,
        name: t.user.name,
        email: t.user.email,
        department: t.department,
        capacity: t.maxStudents,
      }));
      break;
    }
    case "empresas": {
      columns = [
        { key: "name", label: "Empresa" },
        { key: "taxId", label: "CIF" },
        { key: "placements", label: "Ofertas" },
        { key: "seats", label: "Plazas activas" },
      ];
      rows = (
        await db.company.findMany({
          include: { placements: true },
          orderBy: { name: "asc" },
        })
      ).map((c) => ({
        id: c.id,
        href: `/datos/empresas/${c.id}`,
        name: c.name,
        taxId: c.taxId,
        placements: c.placements.length,
        seats: c.placements
          .filter((p) => p.active)
          .reduce((n, p) => n + p.seats, 0),
      }));
      break;
    }
    default: {
      columns = [
        { key: "name", label: "Estudiante" },
        { key: "program", label: "Titulación" },
        { key: "email", label: "Correo" },
        { key: "preferences", label: "Preferencias" },
        { key: "priority", label: "Prioridad" },
        { key: "location", label: "Ubicación" },
      ];
      rows = (
        await db.student.findMany({
          include: { user: true, _count: { select: { preferences: true } } },
          orderBy: { user: { name: "asc" } },
        })
      ).map((s) => ({
        id: s.id,
        href: `/datos/estudiantes/${s.id}`,
        name: s.user.name,
        program: s.program,
        email: s.user.email,
        preferences: s._count.preferences,
        priority: s.priority ? "Sí" : "No",
        location: s.lat === null ? "Pendiente" : "Disponible",
      }));
    }
  }
  return (
    <>
      <PageHeading
        title="Datos del proyecto"
        description="Prepara los datos antes de simular. Abre cualquier registro para editarlo."
      >
        <Button asChild variant="outline">
          <Link href="/datos/importar">Importar CSV</Link>
        </Button>
        <Button asChild>
          <Link
            href={
              tab === "empresas"
                ? "/datos/empresas/nueva"
                : tab === "plazas"
                  ? "/plazas/nueva"
                  : "/opciones/usuarios"
            }
          >
            {tab === "empresas"
              ? "Nueva empresa"
              : tab === "plazas"
                ? "Nueva oferta"
                : "Crear cuenta"}
          </Link>
        </Button>
      </PageHeading>
      <nav
        className="mb-6 flex gap-6 overflow-x-auto border-b"
        aria-label="Tipos de datos"
      >
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/datos?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={`border-b-2 pb-3 text-sm ${t.key === tab ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <DataTable
        key={tab}
        rows={rows}
        columns={columns}
        label="Buscar en los datos…"
      />
      <p className="mt-5 text-xs text-muted-foreground">
        Estudiantes y tutores se crean desde Usuarios. Cada persona puede
        completar su ficha desde Mi perfil.
      </p>
    </>
  );
}
