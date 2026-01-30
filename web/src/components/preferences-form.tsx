"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import {
  preferencesSchema,
  type PreferencesValues,
} from "@/lib/editor-schemas";
import { savePreferencesAction } from "@/app/editor-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFooter, useSave } from "@/components/editor-support";

type Offer = {
  id: string;
  title: string;
  company: string;
  address: string;
  seats: number;
  description: string | null;
  requirements: { competencyId: string; name: string; level: number }[];
};
export function PreferencesForm({
  initial,
  offers,
  competencies,
}: {
  initial: PreferencesValues;
  offers: Offer[];
  competencies: { id: string; name: string; description: string | null }[];
}) {
  const {
    register,
    control,
    setValue,
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<PreferencesValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: initial,
  });
  const selected = useWatch({ control, name: "placementIds" });
  const [query, setQuery] = useState("");
  const status = useSave();
  const setSelection = (ids: string[]) =>
    setValue("placementIds", ids, { shouldDirty: true });
  const move = (index: number, offset: number) => {
    const copy = [...selected];
    [copy[index], copy[index + offset]] = [copy[index + offset], copy[index]];
    setSelection(copy);
  };
  const relevant = new Set(
    offers
      .filter((o) => selected.includes(o.id))
      .flatMap((o) => o.requirements.map((r) => r.competencyId)),
  );
  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (values) => {
        if (await status.save(() => savePreferencesAction(values)))
          reset(values);
      })}
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="panel space-y-4">
          <div>
            <h2 className="font-semibold">1. Tus opciones, en orden</h2>
            <p className="hint mt-2">
              La primera es tu favorita. Puedes recibir otra plaza si no hay
              capacidad.{" "}
              <Link href="/opciones/perfil" className="text-primary underline">
                Revisa tu ubicación y distancia máxima.
              </Link>
            </p>
          </div>
          {selected.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Añade ofertas desde el catálogo para ordenar tus preferencias.
            </p>
          )}
          <ol className="space-y-3">
            {selected.map((id, index) => {
              const offer = offers.find((o) => o.id === id);
              if (!offer) return null;
              return (
                <li
                  className="flex items-center gap-3 rounded-lg border p-3"
                  key={id}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{offer.title}</p>
                    <p className="hint">{offer.company}</p>
                  </div>
                  <div className="flex shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Subir ${offer.title} · ${offer.company}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Bajar ${offer.title} · ${offer.company}`}
                      disabled={index === selected.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar ${offer.title} · ${offer.company}`}
                      onClick={() =>
                        setSelection(selected.filter((key) => key !== id))
                      }
                    >
                      <X />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        <section className="panel space-y-4">
          <h2 className="font-semibold">Ofertas disponibles</h2>
          <Input
            aria-label="Buscar ofertas"
            placeholder="Buscar por oferta, empresa o localidad…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-[30rem] space-y-3 overflow-y-auto pr-1">
            {offers
              .filter(
                (o) =>
                  !selected.includes(o.id) &&
                  `${o.title} ${o.company} ${o.address}`
                    .toLocaleLowerCase("es")
                    .includes(query.toLocaleLowerCase("es")),
              )
              .map((offer) => (
                <article className="rounded-lg border p-4" key={offer.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{offer.title}</h3>
                      <p className="hint mt-1">
                        {offer.company} · {offer.seats} plazas
                      </p>
                      <p className="hint">
                        {offer.address || "Ubicación pendiente"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Añadir ${offer.title} · ${offer.company}`}
                      onClick={() => setSelection([...selected, offer.id])}
                    >
                      <Plus />
                      <span className="hidden sm:inline">Añadir</span>
                    </Button>
                  </div>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-primary">
                      Ver descripción y competencias
                    </summary>
                    {offer.description && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                        {offer.description}
                      </p>
                    )}
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {offer.requirements.map((r) => (
                        <li key={r.competencyId}>
                          {r.name} · nivel {r.level}/5
                        </li>
                      ))}
                    </ul>
                  </details>
                </article>
              ))}
            {offers.every(
              (o) =>
                selected.includes(o.id) ||
                !`${o.title} ${o.company} ${o.address}`
                  .toLocaleLowerCase("es")
                  .includes(query.toLocaleLowerCase("es")),
            ) && (
              <p className="hint py-4">
                No quedan ofertas que coincidan con la búsqueda.
              </p>
            )}
          </div>
        </section>
      </div>
      <section className="panel space-y-5">
        <div>
          <h2 className="font-semibold">2. Tus competencias</h2>
          <p className="hint mt-2">
            Valora tu nivel actual de 1 (básico) a 5 (avanzado) y marca lo que
            quieres aprender. Las competencias de tus opciones aparecen
            destacadas.
          </p>
        </div>
        {competencies.map((c) => (
          <div
            className="grid items-center gap-3 border-t pt-4 sm:grid-cols-[1fr_7rem_12rem]"
            key={c.id}
          >
            <div>
              <label htmlFor={`level-${c.id}`} className="text-sm font-medium">
                {c.name}
              </label>
              {relevant.has(c.id) && (
                <span className="ml-2 rounded bg-accent px-2 py-1 text-[10px] text-primary">
                  En tus opciones
                </span>
              )}
              {c.description && <p className="hint mt-1">{c.description}</p>}
            </div>
            <select
              id={`level-${c.id}`}
              className="select"
              {...register(`competencies.${c.id}.level`, {
                valueAsNumber: true,
              })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option value={n} key={n}>
                  Nivel {n}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                aria-label={`Quiero desarrollar ${c.name}`}
                {...register(`competencies.${c.id}.wantsToDevelop`)}
              />
              Quiero desarrollarla
            </label>
          </div>
        ))}
      </section>
      <FormFooter
        pending={isSubmitting}
        dirty={isDirty}
        errors={errors}
        {...status}
        label="Guardar preferencias y competencias"
      />
      <p className="hint">
        Tus cambios se usarán en la próxima simulación. No modifican una
        asignación ya publicada.
      </p>
    </form>
  );
}
