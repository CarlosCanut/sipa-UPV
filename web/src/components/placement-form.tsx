"use client";
import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { placementSchema, type PlacementValues } from "@/lib/editor-schemas";
import { savePlacementAction } from "@/app/editor-actions";
import { Input } from "@/components/ui/input";
import { HelpPopover } from "@/components/help-popover";
import {
  FormFooter,
  nullableNumber,
  useSave,
} from "@/components/editor-support";

type FormOption = {
  id: string;
  name: string;
  items: { competencyId: string; competency: { name: string } }[];
};
export function PlacementForm({
  initial,
  id,
  companies,
  forms,
  dependencies,
}: {
  initial: PlacementValues;
  id?: string;
  companies: { id: string; name: string }[];
  forms: FormOption[];
  dependencies: { id: string; companyId: string; title: string }[];
}) {
  const dependencyId = useId();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<PlacementValues>({
    resolver: zodResolver(placementSchema),
    defaultValues: initial,
  });
  const formId = useWatch({ control, name: "competencyFormId" });
  const companyId = useWatch({ control, name: "companyId" });
  const form = forms.find((f) => f.id === formId);
  const status = useSave();
  return (
    <form
      className="panel grid gap-5 md:grid-cols-2"
      onSubmit={handleSubmit(async (values) => {
        if (
          await status.save(
            () => savePlacementAction(values, id),
            id ? undefined : (key) => `/plazas/${key}`,
          )
        )
          reset(values);
      })}
    >
      <label className="field md:col-span-2">
        Título de la oferta
        <Input {...register("title")} minLength={2} maxLength={120} required />
      </label>
      <label className="field">
        Empresa
        <select
          className="select"
          {...register("companyId", {
            onChange: () =>
              setValue("dependsOnId", null, { shouldDirty: true }),
          })}
        >
          {companies.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Número de plazas
        <Input
          type="number"
          min={0}
          max={1000}
          required
          {...register("seats", { valueAsNumber: true })}
        />
      </label>
      <label className="field md:col-span-2">
        Titulación orientativa (opcional)
        <Input
          {...register("program")}
          maxLength={150}
          placeholder="Por ejemplo, DAW o DAM"
        />
        <span className="hint">
          Puedes dejarla vacía. El encaje se valora mediante las competencias.
        </span>
      </label>
      <label className="field md:col-span-2">
        Descripción
        <textarea
          className="textarea"
          rows={3}
          maxLength={2000}
          {...register("description")}
        />
      </label>
      <label className="field md:col-span-2">
        Centro de trabajo
        <Input {...register("address")} maxLength={250} />
      </label>
      <label className="field">
        Latitud
        <Input
          type="number"
          step="any"
          min={-90}
          max={90}
          {...register("lat", { setValueAs: nullableNumber })}
        />
      </label>
      <label className="field">
        Longitud
        <Input
          type="number"
          step="any"
          min={-180}
          max={180}
          {...register("lng", { setValueAs: nullableNumber })}
        />
      </label>
      <p className="hint md:col-span-2">
        Copia ambas coordenadas desde tu mapa. Sin ubicación, esta oferta no
        participa en el cálculo.
      </p>
      <label className="field md:col-span-2">
        Formulario de competencias
        <select
          className="select"
          {...register("competencyFormId", {
            onChange: (event) => {
              const next = forms.find((f) => f.id === event.target.value);
              setValue(
                "requirements",
                Object.fromEntries(
                  next?.items.map((i) => [i.competencyId, 3]) ?? [],
                ),
                { shouldDirty: true },
              );
            },
          })}
        >
          {forms.map((f) => (
            <option value={f.id} key={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-4 md:col-span-2">
        <legend className="mb-3 text-sm font-medium">
          Nivel deseado · 1 básico, 5 avanzado
        </legend>
        {form?.items.map((item) => (
          <label
            key={item.competencyId}
            className="flex items-center justify-between gap-4 text-sm"
          >
            {item.competency.name}
            <select
              className="select w-24"
              {...register(`requirements.${item.competencyId}`, {
                valueAsNumber: true,
              })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
      <label className="flex items-start gap-3 text-sm md:col-span-2">
        <input type="checkbox" className="mt-1" {...register("active")} />
        <span>
          Oferta activa
          <span className="hint block">
            Desactívala para retirarla de futuras simulaciones. Las asignaciones
            publicadas se conservan.
          </span>
        </span>
      </label>
      <div className="field md:col-span-2">
        <div className="flex items-center gap-1">
          <label htmlFor={dependencyId}>
            Oferta previa necesaria (opcional)
          </label>
          <HelpPopover label="Oferta previa necesaria">
            Por ejemplo, una oferta de apoyo puede depender de otra principal.
            La de apoyo solo recibirá estudiantes si la principal recibe al
            menos uno. Ambas deben ser de la misma empresa y no pueden depender
            la una de la otra.
          </HelpPopover>
        </div>
        <select
          id={dependencyId}
          className="select"
          {...register("dependsOnId", { setValueAs: (value) => value || null })}
        >
          <option value="">Sin dependencia</option>
          {dependencies
            .filter((offer) => offer.companyId === companyId && offer.id !== id)
            .map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.title}
              </option>
            ))}
        </select>
        <span className="hint">
          Esta oferta solo recibe estudiantes si la oferta previa tiene al menos
          una plaza asignada.
        </span>
      </div>
      <FormFooter
        pending={isSubmitting}
        dirty={isDirty || !id}
        errors={errors}
        {...status}
      />
    </form>
  );
}
