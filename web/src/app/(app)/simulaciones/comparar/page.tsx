import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { metricsSchema } from "@/lib/schemas";
import { evaluateScenario } from "@/lib/evaluation";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  await requireRole("ADMIN");
  const query = await searchParams;
  const simulations = await db.simulation.findMany({
    where: { status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    include: {
      assignments: {
        select: { studentId: true, placementId: true, tutorId: true },
      },
    },
  });
  const a =
    simulations.find((s) => s.id === query.a) ??
    simulations.find((s) => s.id !== (query.b ?? simulations[0]?.id));
  const b =
    simulations.find((s) => s.id === query.b) ??
    simulations.find((s) => s.id !== a?.id);
  const left = a ? metricsSchema.safeParse(a.metrics) : null;
  const right = b ? metricsSchema.safeParse(b.metrics) : null;
  const ea = a ? evaluateScenario(a.input, a.assignments) : null;
  const eb = b ? evaluateScenario(b.input, b.assignments) : null;
  const assignedIds = (
    rows: { studentId: string; placementId: string | null }[],
  ) =>
    rows
      .filter((r) => r.placementId)
      .map((r) => r.studentId)
      .sort()
      .join(",");
  const comparable = Boolean(
    ea &&
      eb &&
      ea.dataset === eb.dataset &&
      a &&
      b &&
      assignedIds(a.assignments) === assignedIds(b.assignments),
  );
  const value = (n: number | null | undefined, unit = "") =>
    n == null
      ? "—"
      : `${n.toLocaleString("es-ES", { maximumFractionDigits: 2 })}${unit}`;
  return (
    <>
      <Link
        href="/simulaciones"
        className="mb-6 inline-block text-sm text-primary hover:underline"
      >
        ← Volver a simulaciones
      </Link>
      <PageHeading
        title="Comparar propuestas"
        description="Comprueba el equilibrio entre preferencias, desplazamientos, equidad y carga de tutoría."
      />
      {simulations.length < 2 ? (
        <p className="panel">
          Completa al menos dos simulaciones para compararlas. Puedes ajustar y
          relanzar una propuesta existente.
        </p>
      ) : (
        <>
          <form
            className="panel mb-6 grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
            method="get"
          >
            <label className="field min-w-0 flex-1">
              A · Referencia
              <select name="a" className="select" defaultValue={a?.id}>
                {simulations.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field min-w-0 flex-1">
              B · Alternativa
              <select name="b" className="select" defaultValue={b?.id}>
                {simulations.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Button>Comparar</Button>
          </form>
          {a && b && left?.success && right?.success && (
            <>
              {a.id === b.id ? (
                <p className="panel mb-6" role="status">
                  Selecciona dos propuestas diferentes.
                </p>
              ) : !comparable ? (
                <p className="panel mb-6 text-sm">
                  Los datos de entrada o el alumnado asignado son distintos.
                  Puedes revisar las métricas, pero no atribuir sus diferencias
                  únicamente al algoritmo o sus parámetros.
                </p>
              ) : (
                <p className="panel mb-6 text-sm">
                  Mismos datos de entrada y alumnado asignado. Cambio de
                  distancia estudiantil de A a B:{" "}
                  <strong>
                    {value(right.data.totalKm - left.data.totalKm, " km")}
                  </strong>
                  {left.data.totalKm > 0
                    ? ` (${value((100 * (right.data.totalKm - left.data.totalKm)) / left.data.totalKm, "%")})`
                    : ""}
                  . Un valor negativo indica menor distancia estimada.
                </p>
              )}
              <div className="overflow-hidden rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicador</TableHead>
                      <TableHead>
                        <Link
                          className="text-primary underline"
                          href={`/simulaciones/${a.id}`}
                        >
                          {a.name}
                        </Link>
                      </TableHead>
                      <TableHead>
                        <Link
                          className="text-primary underline"
                          href={`/simulaciones/${b.id}`}
                        >
                          {b.name}
                        </Link>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["Algoritmo", a.algorithm, b.algorithm],
                      [
                        "Asignados / total",
                        `${ea?.assigned ?? "—"} / ${ea?.total ?? "—"}`,
                        `${eb?.assigned ?? "—"} / ${eb?.total ?? "—"}`,
                      ],
                      [
                        "Primera preferencia",
                        value(left.data.firstChoicePct, "%"),
                        value(right.data.firstChoicePct, "%"),
                      ],
                      [
                        "Preferencia media (solo opciones clasificadas)",
                        value(left.data.avgPreferenceRank || null),
                        value(right.data.avgPreferenceRank || null),
                      ],
                      [
                        "Distancia estudiantil total",
                        value(left.data.totalKm, " km"),
                        value(right.data.totalKm, " km"),
                      ],
                      [
                        "Distancia estudiantil media",
                        value(left.data.avgKm, " km"),
                        value(right.data.avgKm, " km"),
                      ],
                      [
                        "Visitas de tutoría · estimación",
                        value(ea?.tutorVisitKm, " km"),
                        value(eb?.tutorVisitKm, " km"),
                      ],
                      [
                        "Prioridad atendida",
                        value(ea?.priorityAssignedPct, "%"),
                        value(eb?.priorityAssignedPct, "%"),
                      ],
                      [
                        "Resto del alumnado atendido",
                        value(ea?.otherAssignedPct, "%"),
                        value(eb?.otherAssignedPct, "%"),
                      ],
                      [
                        "Desviación de carga de tutoría",
                        value(left.data.tutorLoadStdDev),
                        value(right.data.tutorLoadStdDev),
                      ],
                      [
                        "Tiempo de cálculo y respuesta",
                        value(
                          a.finishedAt
                            ? (a.finishedAt.getTime() - a.createdAt.getTime()) /
                                1000
                            : null,
                          " s",
                        ),
                        value(
                          b.finishedAt
                            ? (b.finishedAt.getTime() - b.createdAt.getTime()) /
                                1000
                            : null,
                          " s",
                        ),
                      ],
                    ].map(([label, x, y]) => (
                      <TableRow key={label}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell>{x}</TableCell>
                        <TableCell>{y}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="hint mt-5">
                Distancias en línea recta, de ida. Tutoría supone una visita de
                cada tutor a cada centro asignado, sin rutas compartidas ni
                frecuencia. No mide kilómetros reales ni emisiones. Una
                desviación de carga menor indica un reparto más uniforme; no
                prueba equidad por sí sola. El tiempo mostrado no mide el tiempo
                de decisión humana.
              </p>
            </>
          )}
        </>
      )}
    </>
  );
}
