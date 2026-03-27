import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { failStale } from "@/lib/simulations";
import { getAlgorithms } from "@/lib/solver";
import { metricsSchema } from "@/lib/schemas";
import { PageHeading } from "@/components/page-heading";
import { SimulationDialog } from "@/components/simulation-dialog";
import { SimulationStatus } from "@/components/simulation-status";
import { RefreshWhileRunning } from "@/components/refresh-while-running";
import { DataReadiness } from "@/components/data-readiness";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default async function SimulationsPage() {
  await requireRole("ADMIN");
  await failStale();
  const [simulations, algorithms] = await Promise.all([
    db.simulation.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { assignments: true } } },
    }),
    getAlgorithms().catch(() => []),
  ]);
  return (
    <>
      <PageHeading
        title="Simulaciones"
        description="Crea propuestas, compara resultados y publica las asignaciones."
      >
        <Button asChild variant="outline">
          <Link href="/simulaciones/comparar">Comparar propuestas</Link>
        </Button>
        <SimulationDialog algorithms={algorithms} />
      </PageHeading>
      <DataReadiness />
      {algorithms.length > 0 && (
        <p className="mb-6 rounded-lg border bg-accent p-4 text-sm text-accent-foreground">
          {algorithms.some((algorithm) => algorithm.key === "external")
            ? "Motor externo configurado. Revisa cada propuesta antes de publicarla."
            : "Modo de demostración. Las propuestas permiten probar el proceso; no son resultados del modelo de investigación validado."}
        </p>
      )}
      <RefreshWhileRunning
        running={simulations.some((s) => s.status === "RUNNING")}
      />
      {!algorithms.length && (
        <p role="alert" className="panel mb-5 text-sm">
          El servicio de asignación no está disponible. Las propuestas guardadas
          siguen accesibles.
        </p>
      )}
      <div className="mb-6 flex items-center gap-3 border-b pb-4 text-sm">
        <span className="font-medium text-primary">Todas las propuestas</span>
        <span className="rounded-full bg-muted px-2 text-xs">
          {simulations.length}
        </span>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
          Solo la propuesta publicada es visible para participantes
        </span>
      </div>
      {simulations.length === 0 ? (
        <div className="panel py-16 text-center">
          <GitBranch className="mx-auto mb-4 size-9 text-primary" />
          <h2 className="text-lg font-semibold">
            Tu primera propuesta empieza aquí
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Revisa los datos de estudiantes, plazas y tutores. Después, lanza
            una simulación para explorar una posible asignación.
          </p>
          <Link
            href="/datos"
            className="mt-5 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Revisar los datos
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {[
                  "Simulación",
                  "Asignados",
                  "1.ª preferencia",
                  "Distancia media",
                  "Estado",
                  "",
                ].map((label, index) => (
                  <TableHead className="h-12 px-5 text-xs" key={index}>
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulations.map((s) => {
                const parsed = metricsSchema.safeParse(s.metrics);
                const m = parsed.success ? parsed.data : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="px-5 py-5">
                      <Link
                        href={`/simulaciones/${s.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="rounded-lg bg-muted p-2">
                          <GitBranch size={18} />
                        </span>
                        <span>
                          <span className="font-medium hover:underline">
                            {s.name}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {s.createdAt.toLocaleString("es-ES", {
                              timeZone: "Europe/Madrid",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                            {s.parentId
                              ? " · Ajuste de propuesta"
                              : " · Propuesta inicial"}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="px-5">
                      {m
                        ? `${s._count.assignments - m.unassignedCount} / ${s._count.assignments}`
                        : "—"}
                    </TableCell>
                    <TableCell className="px-5">
                      {m ? `${m.firstChoicePct}%` : "—"}
                    </TableCell>
                    <TableCell className="px-5">
                      {m ? `${m.avgKm} km` : "—"}
                    </TableCell>
                    <TableCell className="px-5">
                      <SimulationStatus
                        status={s.status}
                        published={Boolean(s.publishedAt)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        className="inline-flex p-2"
                        aria-label={`Abrir ${s.name}`}
                        href={`/simulaciones/${s.id}`}
                      >
                        <ArrowRight size={17} />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        Las distancias se calculan en línea recta. Revisa cada propuesta antes
        de publicarla.
      </p>
    </>
  );
}
