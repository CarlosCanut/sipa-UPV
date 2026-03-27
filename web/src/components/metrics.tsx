import { metricsSchema } from "@/lib/schemas";
import { HelpPopover } from "@/components/help-popover";
export function Metrics({ value }: { value: unknown }) {
  const parsed = metricsSchema.safeParse(value);
  if (!parsed.success) return null;
  const m = parsed.data;
  const metrics = [
    ["Primera preferencia", `${m.firstChoicePct}%`, "Del alumnado asignado"],
    ["Distancia media", `${m.avgKm} km`, "En línea recta"],
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
      <dl className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <dt>Preferencia media</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {m.avgPreferenceRank || "—"}
          </dd>
          <HelpPopover label="Preferencia media">
            Posición media de la plaza asignada en la lista de preferencias: 1
            es la primera opción. Solo incluye asignaciones presentes en esa
            lista.
          </HelpPopover>
        </div>
        <div className="flex items-center gap-2">
          <dt>Distancia total</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {m.totalKm} km
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt>Desviación de carga de tutores</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {m.tutorLoadStdDev}
          </dd>
          <HelpPopover label="Desviación de carga de tutores">
            Mide cuánto varía el número de estudiantes entre tutores. 0 indica
            el mismo número para todos; un valor mayor indica más diferencia.
            Por sí sola, no refleja si se ha cubierto la demanda.
          </HelpPopover>
        </div>
      </dl>
    </>
  );
}
