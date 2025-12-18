"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Play, Plus, SlidersHorizontal } from "lucide-react";
import {
  simulationSchema,
  defaultParams,
  type SimulationParams,
} from "@/lib/schemas";
import { launchAction } from "@/app/actions";
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
export type AlgorithmOption = {
  key: string;
  name: string;
  defaultParams: SimulationParams;
};
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
  const [error, setError] = useState("");
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof simulationSchema>>({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      name: parent ? `${parent.name} · ajuste` : "Nueva propuesta",
      algorithm: parent?.algorithm ?? algorithms[0]?.key ?? "placeholder",
      params: parent?.params ?? algorithms[0]?.defaultParams ?? defaultParams,
      parentId: parent?.id,
    },
  });
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
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {parent ? "Ajustar y relanzar" : "Nueva simulación"}
          </DialogTitle>
          <DialogDescription>
            {parent
              ? "Conserva la propuesta anterior y crea una nueva versión con estos parámetros."
              : "Equilibra preferencias, competencias y proximidad. Podrás revisar el resultado antes de publicarlo."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5 pt-2"
          onSubmit={handleSubmit(async (values) => {
            setError("");
            const result = await launchAction(values);
            if (result.error) {
              setError(result.error);
              return;
            }
            setOpen(false);
            router.push(`/simulaciones/${result.id}`);
            router.refresh();
          })}
        >
          <label className="field">
            Nombre
            <Input {...register("name")} maxLength={100} />
            {errors.name && (
              <span className="error-text">{errors.name.message}</span>
            )}
          </label>
          <label className="field">
            Algoritmo
            <select
              className="h-9 rounded-md border bg-background px-3 font-normal"
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
            <span className="hint">
              La heurística de referencia genera una propuesta; no garantiza el
              óptimo.
            </span>
          </label>
          <fieldset className="rounded-lg border bg-muted/40 p-4">
            <legend className="px-1 text-sm font-medium">
              Peso de cada criterio
            </legend>
            <div className="grid grid-cols-3 gap-4">
              {(
                [
                  ["preference", "Preferencias"],
                  ["competency", "Competencias"],
                  ["distance", "Proximidad"],
                ] as const
              ).map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    {...register(`params.weights.${key}`, {
                      valueAsNumber: true,
                    })}
                  />
                </label>
              ))}
            </div>
            <p className="hint mt-3">
              Valores de 0 a 1. El solver normaliza los pesos automáticamente.
            </p>
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <label className="field">
              Distancia máxima (km)
              <Input
                type="number"
                min="0.1"
                max="1000"
                step="0.1"
                {...register("params.maxDistanceKm", { valueAsNumber: true })}
              />
            </label>
            <label className="field">
              Tiempo límite (s)
              <Input
                type="number"
                min="1"
                max="3600"
                {...register("params.timeLimitSec", { valueAsNumber: true })}
              />
            </label>
            <label className="field">
              Semilla
              <Input
                type="number"
                min="0"
                max="2147483647"
                {...register("params.seed", { valueAsNumber: true })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                {...register("params.assignTutors")}
              />
              Asignar tutores
            </label>
          </div>
          {errors.params && (
            <p role="alert" className="error-text">
              Revisa los valores. Debe haber al menos un peso mayor que cero.
            </p>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button disabled={isSubmitting}>
              <Play />
              {isSubmitting ? "Iniciando…" : "Lanzar simulación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
