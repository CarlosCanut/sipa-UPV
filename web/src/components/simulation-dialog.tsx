"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  LoaderCircle,
  Play,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import {
  simulationSchema,
  defaultParams,
  type SimulationParams,
} from "@/lib/schemas";
import { launchAction } from "@/app/actions";
import { HelpPopover } from "@/components/help-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AlgorithmOption = {
  key: string;
  name: string;
  defaultParams: SimulationParams;
};
const criteria = [
  {
    key: "preference",
    label: "Preferencias",
    help: "Da más importancia a las ofertas que cada estudiante ha situado primero en su lista.",
  },
  {
    key: "competency",
    label: "Competencias",
    help: "Valora la coincidencia entre el nivel actual del estudiante y las competencias que pide la plaza.",
  },
  {
    key: "distance",
    label: "Proximidad",
    help: "Favorece las plazas más cercanas a la ubicación de referencia del estudiante, dentro de su distancia máxima.",
  },
  {
    key: "development",
    label: "Desarrollo",
    help: "Favorece las plazas relacionadas con las competencias que el estudiante quiere desarrollar.",
  },
] as const;

export function SimulationDialog({
  algorithms,
  parent,
}: {
  algorithms: AlgorithmOption[];
  parent?: {
    id: string;
    name: string;
    algorithm: string;
    params: SimulationParams;
  };
}) {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof simulationSchema>,
    unknown,
    z.output<typeof simulationSchema>
  >({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      name: parent ? `${parent.name} · ajuste` : "Nueva propuesta",
      algorithm: algorithms.some((a) => a.key === parent?.algorithm)
        ? parent!.algorithm
        : (algorithms[0]?.key ?? "placeholder"),
      params: parent?.params ?? algorithms[0]?.defaultParams ?? defaultParams,
      parentId: parent?.id,
    },
  });
  const assignTutors = useWatch({ control, name: "params.assignTutors" });
  const tutorTravelWeight =
    useWatch({ control, name: "params.tutorTravelWeight" }) ?? 0.5;
  const algorithm = useWatch({ control, name: "algorithm" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={parent ? "outline" : "default"}
          disabled={!algorithms.length}
        >
          {parent ? <SlidersHorizontal /> : <Plus />}
          {parent ? "Ajustar y relanzar" : "Nueva simulación"}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex overflow-hidden flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12 text-left">
          <DialogTitle>
            {parent ? "Ajustar y relanzar" : "Nueva simulación"}
          </DialogTitle>
          <DialogDescription>
            {parent
              ? "Crea una nueva versión conservando la propuesta anterior."
              : "Configura la propuesta. Podrás revisarla antes de publicarla."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={handleSubmit(
            async (values) => {
              setError("");
              try {
                const result = await launchAction(values);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                router.push(`/simulaciones/${result.id}`);
                router.refresh();
              } catch {
                setError(
                  "No se pudo iniciar la simulación. Inténtalo de nuevo.",
                );
              }
            },
            () => setAdvancedOpen(true),
          )}
        >
          <div className="space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field">
                Nombre
                <Input
                  {...register("name")}
                  maxLength={100}
                  aria-invalid={!!errors.name}
                  aria-describedby={
                    errors.name ? `${id}-name-error` : undefined
                  }
                />
                {errors.name && (
                  <span id={`${id}-name-error`} className="error-text">
                    {errors.name.message}
                  </span>
                )}
              </label>
              <label className="field">
                Algoritmo
                <select
                  className="select h-9 font-normal"
                  {...register("algorithm", {
                    onChange: (e) => {
                      const selected = algorithms.find(
                        (a) => a.key === e.target.value,
                      );
                      if (selected && !parent)
                        setValue("params", selected.defaultParams);
                    },
                  })}
                >
                  {algorithms.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {algorithm === "placeholder" && (
              <p className="hint">
                Modo de demostración. No garantiza la mejor solución posible.
              </p>
            )}
            <fieldset className="rounded-lg border bg-muted/40 px-4 pb-4">
              <legend className="px-1 text-sm font-medium">
                Peso de cada criterio
              </legend>
              <p className="hint mt-2 mb-3">
                De 0 a 1: un peso mayor da más importancia al criterio. No
                tienen que sumar 1; usa 0 para ignorarlo.
              </p>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[360px]:grid-cols-2 sm:grid-cols-4">
                {criteria.map(({ key, label, help }) => (
                  <div className="field" key={key}>
                    <div className="flex items-center justify-between gap-1">
                      <label htmlFor={`${id}-${key}`}>{label}</label>
                      <HelpPopover label={label}>{help}</HelpPopover>
                    </div>
                    <Input
                      id={`${id}-${key}`}
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      aria-invalid={!!errors.params?.weights}
                      {...register(`params.weights.${key}`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <label className="field">
                Distancia máxima (km)
                <Input
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  aria-describedby={`${id}-distance-hint`}
                  {...register("params.maxDistanceKm", { valueAsNumber: true })}
                />
                <span id={`${id}-distance-hint`} className="hint">
                  En línea recta. Se respeta el límite personal del estudiante
                  si es menor.
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  {...register("params.assignTutors")}
                />
                <span className="font-medium">
                  Asignar tutores
                  <span className="hint mt-1 block">
                    Respeta la capacidad disponible de cada tutor.
                  </span>
                </span>
              </label>
            </div>
            <details
              className="group border-t pt-3"
              open={advancedOpen}
              onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium">
                Opciones avanzadas
                <ChevronDown
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="grid gap-4 pt-3 sm:grid-cols-2">
                <label className="field">
                  Tiempo límite (s)
                  <Input
                    type="number"
                    min="1"
                    max="3600"
                    {...register("params.timeLimitSec", {
                      valueAsNumber: true,
                    })}
                  />
                  <span className="hint">Duración máxima del cálculo.</span>
                </label>
                <div className="field">
                  <div className="flex items-center gap-1">
                    <label htmlFor={`${id}-seed`}>Semilla</label>
                    <HelpPopover label="Semilla">
                      Permite repetir la parte aleatoria del cálculo con los
                      mismos datos y parámetros. Puedes mantener el valor por
                      defecto.
                    </HelpPopover>
                  </div>
                  <Input
                    id={`${id}-seed`}
                    type="number"
                    min="0"
                    max="2147483647"
                    {...register("params.seed", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-3 sm:col-span-2" hidden={!assignTutors}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <label
                      htmlFor={`${id}-tutor-balance`}
                      className="font-medium"
                    >
                      Prioridad de tutoría
                    </label>
                    <span className="text-muted-foreground tabular-nums">
                      {Math.round(tutorTravelWeight * 100)}% proximidad
                    </span>
                  </div>
                  <input
                    id={`${id}-tutor-balance`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    className="h-6 w-full accent-primary"
                    aria-valuetext={`${Math.round(tutorTravelWeight * 100)}% proximidad, ${Math.round((1 - tutorTravelWeight) * 100)}% reparto de carga`}
                    {...register("params.tutorTravelWeight", {
                      valueAsNumber: true,
                    })}
                  />
                  <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                    <span>Repartir la carga</span>
                    <span>Reducir distancias</span>
                  </div>
                </div>
              </div>
            </details>
            {errors.params && (
              <p role="alert" className="error-text">
                Revisa los valores y las opciones avanzadas. Debe haber al menos
                un peso mayor que cero.
              </p>
            )}
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col-reverse justify-end gap-3 border-t bg-card px-6 py-4 min-[360px]:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Play />
              )}
              {isSubmitting ? "Iniciando…" : "Lanzar simulación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
