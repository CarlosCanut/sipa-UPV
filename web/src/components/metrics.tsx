import { metricsSchema } from "@/lib/schemas";
export function Metrics({ value }: { value: unknown }) {
  const parsed = metricsSchema.safeParse(value);
  if (!parsed.success) return null;
  const m = parsed.data;
  const metrics = [
    ["Primera preferencia", `${m.firstChoicePct}%`, "Del alumnado asignado"],
    ["Distancia media", `${m.avgKm} km`, "En línea recta · Haversine"],
    ["Sin asignar", m.unassignedCount, "Pendientes de revisión"],
    [
      "Prioridad atendida",
      `${m.priorityAssignedPct}%`,
      "Del alumnado prioritario",
    ],
  ];
  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, hint]) => (
          <div className="panel" key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="my-3 text-3xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>
      <p className="mb-8 text-xs leading-6 text-muted-foreground">
        Preferencia media: {m.avgPreferenceRank || "—"} · Distancia total:{" "}
        {m.totalKm} km · Desviación de carga de tutores: {m.tutorLoadStdDev}
      </p>
    </>
  );
}
