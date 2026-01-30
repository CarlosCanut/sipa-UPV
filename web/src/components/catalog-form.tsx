"use client";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { competencySchema, competencyFormSchema } from "@/lib/editor-schemas";
import { saveCatalogAction, deleteCatalogAction } from "@/app/editor-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormFooter, useSave } from "@/components/editor-support";

export function CatalogForm({
  kind,
  id,
  initial,
  competencies,
  inUse = false,
}: {
  kind: "competency" | "form";
  id?: string;
  initial?: { name: string; description: string; competencyIds: string[] };
  competencies: { id: string; name: string }[];
  inUse?: boolean;
}) {
  const defaults = initial ?? { name: "", description: "", competencyIds: [] };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<z.infer<typeof competencyFormSchema>>({
    resolver: zodResolver(
      kind === "form"
        ? competencyFormSchema
        : competencySchema.extend({ competencyIds: z.array(z.string()) }),
    ),
    defaultValues: defaults,
  });
  const status = useSave();
  const [deleting, startDelete] = useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        if (await status.save(() => saveCatalogAction(kind, values, id)))
          reset(id ? values : defaults);
      })}
    >
      <label className="field">
        Nombre
        <Input {...register("name")} minLength={2} maxLength={120} required />
      </label>
      <label className="field">
        Descripción
        <textarea
          className="textarea"
          rows={2}
          maxLength={2000}
          {...register("description")}
        />
      </label>
      {kind === "form" && (
        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-medium">
            Competencias del formulario
          </legend>
          {competencies.map((c) => (
            <label className="flex items-center gap-2 text-sm" key={c.id}>
              <input
                type="checkbox"
                value={c.id}
                {...register("competencyIds")}
              />
              {c.name}
            </label>
          ))}
          {inUse && (
            <p className="hint">
              Este formulario ya se usa en ofertas. Puedes editar su nombre y
              descripción; para otra selección de competencias, crea un
              formulario.
            </p>
          )}
        </fieldset>
      )}
      <FormFooter
        pending={isSubmitting || deleting}
        dirty={isDirty}
        errors={errors}
        {...status}
      />
      {id && !inUse && (
        <Button
          type="button"
          variant="ghost"
          className="text-destructive"
          disabled={deleting || isSubmitting}
          onClick={() => {
            if (window.confirm("¿Eliminar este registro sin uso?"))
              startDelete(async () => {
                await status.save(() => deleteCatalogAction(kind, id));
              });
          }}
        >
          Eliminar registro sin uso
        </Button>
      )}
    </form>
  );
}
