import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getAlgorithms } from "@/lib/solver";
import { paramsSchema } from "@/lib/schemas";
import { failStale } from "@/lib/simulations";
import { PageHeading } from "@/components/page-heading";
import { SimulationDialog } from "@/components/simulation-dialog";
import { SimulationStatus } from "@/components/simulation-status";
import { RefreshWhileRunning } from "@/components/refresh-while-running";
import { PublishButton } from "@/components/publish-button";
import { Metrics } from "@/components/metrics";
import { DataTable } from "@/components/data-table";
export default async function SimulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  await failStale();
  const { id } = await params;
  const [s, algorithms] = await Promise.all([
    db.simulation.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        assignments: {
          orderBy: { student: { user: { name: "asc" } } },
          include: {
            student: { include: { user: true } },
            placement: { include: { company: true } },
            tutor: { include: { user: true } },
          },
        },
      },
    }),
    getAlgorithms().catch(() => []),
  ]);
  if (!s) notFound();
  const settings = paramsSchema.parse(s.params);
  const metadata =
    s.metrics && typeof s.metrics === "object" && !Array.isArray(s.metrics)
      ? s.metrics
      : {};
  return (
    <>
      <Link
        href="/simulaciones"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} />
        Volver a simulaciones
      </Link>
      <PageHeading
        title={s.name}
        description="Revisa los resultados y decide cuándo compartir la propuesta."
      >
        <SimulationDialog
          algorithms={algorithms}
          parent={{
            id,
            name: s.name,
            algorithm: s.algorithm,
            params: settings,
          }}
        />
        {s.status === "COMPLETED" && (
          <PublishButton id={id} published={Boolean(s.publishedAt)} />
        )}
      </PageHeading>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <SimulationStatus
          status={s.status}
          published={Boolean(s.publishedAt)}
        />
        <span>
          {settings.maxDistanceKm} km máx. · Semilla {settings.seed} ·{" "}
          {settings.assignTutors ? "Con tutores" : "Sin tutores"}
        </span>
        {s.parent && (
          <Link
            className="text-primary underline"
            href={`/simulaciones/${s.parent.id}`}
          >
            Derivada de: {s.parent.name}
          </Link>
        )}
      </div>
      <RefreshWhileRunning running={s.status === "RUNNING"} />
      {s.status === "RUNNING" && (
        <div className="panel flex items-center gap-4 py-12" role="status">
          <LoaderCircle className="animate-spin text-primary" />
          <div>
            <h2 className="font-semibold">Calculando…</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Puedes salir de esta página. Te avisaremos cuando esté lista.
            </p>
          </div>
        </div>
      )}
      {s.error && (
        <p role="alert" className="panel mb-6 text-sm text-destructive">
          {s.error}
        </p>
      )}
      {metadata.solverStatus === "timeout" && (
        <p className="panel mb-6 text-sm">
          El solver alcanzó el tiempo límite. Estos son los resultados
          parciales; revísalos antes de publicar.
        </p>
      )}
      <Metrics value={s.metrics} />
      {s.status === "COMPLETED" && (
        <>
          <h2 className="mb-4 text-lg font-semibold">
            Asignaciones{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {s.assignments.length} estudiantes
            </span>
          </h2>
          <DataTable
            label="Buscar estudiante, empresa o tutor…"
            columns={[
              { key: "student", label: "Estudiante" },
              { key: "company", label: "Empresa" },
              { key: "placement", label: "Plaza" },
              { key: "tutor", label: "Tutor/a" },
              { key: "score", label: "Puntuación" },
              { key: "distance", label: "Distancia" },
            ]}
            rows={s.assignments.map((a) => ({
              id: a.id,
              student: a.student.user.name,
              company: a.placement?.company.name ?? "—",
              placement: a.placement?.title ?? "Sin asignar",
              tutor: a.tutor?.user.name ?? "Sin tutor",
              score: a.score?.toFixed(2) ?? "—",
              distance:
                a.distanceKm == null ? "—" : `${a.distanceKm.toFixed(1)} km`,
            }))}
          />
        </>
      )}
    </>
  );
}
