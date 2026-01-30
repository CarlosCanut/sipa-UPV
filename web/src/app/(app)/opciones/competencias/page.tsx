import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/page-heading";
import { CatalogForm } from "@/components/catalog-form";

export default async function CompetenciesPage() {
  await requireRole("ADMIN");
  const [competencies, forms] = await Promise.all([
    db.competency.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { formItems: true, requirements: true, studentLevels: true },
        },
      },
    }),
    db.competencyForm.findMany({
      orderBy: { name: "asc" },
      include: {
        items: { orderBy: { position: "asc" } },
        _count: { select: { placements: true } },
      },
    }),
  ]);
  return (
    <>
      <PageHeading
        title="Competencias y formularios"
        description="Las empresas eligen un formulario; el alumnado se autoevalúa una sola vez por competencia."
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="panel space-y-4">
          <h2 className="font-semibold">
            Competencias · {competencies.length}
          </h2>
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              Añadir competencia
            </summary>
            <div className="mt-5">
              <CatalogForm kind="competency" competencies={[]} />
            </div>
          </details>
          {competencies.map((c) => (
            <details key={c.id} className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                {c.name}
              </summary>
              <div className="mt-5">
                <CatalogForm
                  kind="competency"
                  id={c.id}
                  competencies={[]}
                  inUse={Object.values(c._count).some((count) => count > 0)}
                  initial={{
                    name: c.name,
                    description: c.description ?? "",
                    competencyIds: [],
                  }}
                />
              </div>
            </details>
          ))}
        </section>
        <section className="panel space-y-4">
          <h2 className="font-semibold">Formularios · {forms.length}</h2>
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              Crear formulario
            </summary>
            <div className="mt-5">
              <CatalogForm kind="form" competencies={competencies} />
            </div>
          </details>
          {forms.map((f) => (
            <details key={f.id} className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                {f.name}
                <span className="hint ml-2">
                  {f.items.length} competencias · {f._count.placements} ofertas
                </span>
              </summary>
              <div className="mt-5">
                <CatalogForm
                  kind="form"
                  id={f.id}
                  competencies={competencies}
                  inUse={f._count.placements > 0}
                  initial={{
                    name: f.name,
                    description: f.description ?? "",
                    competencyIds: f.items.map((i) => i.competencyId),
                  }}
                />
              </div>
            </details>
          ))}
        </section>
      </div>
    </>
  );
}
