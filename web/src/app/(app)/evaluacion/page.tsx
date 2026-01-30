import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { roleLabels } from "@/lib/roles";
import { PageHeading } from "@/components/page-heading";
import { PilotForm } from "@/components/feedback-form";
import { ExportButton } from "@/components/export-button";
import { DataTable } from "@/components/data-table";

export default async function EvaluationPage() {
  const { user } = await requireRole();
  const [own, responses] = await Promise.all([
    db.pilotResponse.findUnique({ where: { userId: user.id } }),
    user.role === "ADMIN"
      ? db.pilotResponse.findMany({
          include: { user: { select: { role: true } } },
          orderBy: { updatedAt: "desc" },
        })
      : [],
  ]);
  const mean = (key: "usability" | "usefulness" | "satisfaction") =>
    responses.length
      ? (
          responses.reduce((sum, r) => sum + r[key], 0) / responses.length
        ).toFixed(1)
      : "—";
  return (
    <>
      <PageHeading
        title="Evaluación del piloto"
        description="Ayúdanos a entender qué funciona y qué debemos mejorar."
      >
        {user.role === "ADMIN" && (
          <ExportButton kind="pilot" label="Exportar respuestas" />
        )}
      </PageHeading>
      {user.role === "ADMIN" && (
        <section className="mb-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ["Respuestas", responses.length],
              ["Facilidad de uso", mean("usability")],
              ["Utilidad", mean("usefulness")],
              ["Satisfacción", mean("satisfaction")],
            ].map(([label, value]) => (
              <div className="panel" key={label}>
                <p className="hint">{label}</p>
                <p className="mt-2 text-2xl font-semibold">
                  {value}
                  {label !== "Respuestas" && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / 5
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
          <DataTable
            columns={[
              { key: "role", label: "Perfil" },
              { key: "usability", label: "Facilidad" },
              { key: "usefulness", label: "Utilidad" },
              { key: "satisfaction", label: "Satisfacción" },
              { key: "barriers", label: "Barreras y mejoras" },
            ]}
            rows={responses.map((r) => ({
              id: r.id,
              role: roleLabels[r.user.role],
              usability: r.usability,
              usefulness: r.usefulness,
              satisfaction: r.satisfaction,
              barriers: r.barriers || "Sin comentario",
            }))}
          />
        </section>
      )}
      <PilotForm
        initial={
          own
            ? {
                usability: own.usability,
                usefulness: own.usefulness,
                satisfaction: own.satisfaction,
                barriers: own.barriers ?? "",
              }
            : undefined
        }
      />
    </>
  );
}
