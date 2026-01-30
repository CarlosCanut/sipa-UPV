"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { feedbackSchema, pilotSchema } from "@/lib/editor-schemas";
import { saveFeedbackAction, savePilotAction } from "@/app/editor-actions";
import { FormFooter, useSave } from "@/components/editor-support";

export function FeedbackForm({
  assignmentId,
  initial,
}: {
  assignmentId: string;
  initial?: { rating: number; comment: string | null };
}) {
  const {
    register,
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      assignmentId,
      rating: initial?.rating ?? 0,
      comment: initial?.comment ?? "",
    },
  });
  const status = useSave();
  return (
    <form
      className="panel max-w-3xl space-y-5"
      onSubmit={handleSubmit(async (values) => {
        if (await status.save(() => saveFeedbackAction(values))) reset(values);
      })}
    >
      <div>
        <h2 className="font-semibold">¿Cómo valoras esta asignación?</h2>
        <p className="hint mt-2">
          Tu valoración ayuda a coordinación a evaluar la propuesta. Puedes
          actualizarla mientras esté publicada.
        </p>
      </div>
      <label className="field">
        Valoración
        <select
          className="select max-w-xs"
          {...register("rating", { valueAsNumber: true })}
          required
        >
          <option value={0} disabled>
            Selecciona una valoración
          </option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option value={n} key={n}>
              {n} ·{" "}
              {n === 1
                ? "Muy insatisfactoria"
                : n === 2
                  ? "Insatisfactoria"
                  : n === 3
                    ? "Aceptable"
                    : n === 4
                      ? "Satisfactoria"
                      : "Muy satisfactoria"}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Comentario (opcional)
        <textarea
          className="textarea"
          rows={3}
          maxLength={2000}
          {...register("comment")}
        />
        <span className="hint">
          Lo verá coordinación. Evita datos sensibles o información personal de
          terceros.
        </span>
      </label>
      <FormFooter
        pending={isSubmitting}
        dirty={isDirty}
        errors={errors}
        {...status}
        label={initial ? "Actualizar valoración" : "Enviar valoración"}
      />
    </form>
  );
}

export function PilotForm({
  initial,
}: {
  initial?: z.infer<typeof pilotSchema>;
}) {
  const {
    register,
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<z.infer<typeof pilotSchema>>({
    resolver: zodResolver(pilotSchema),
    defaultValues: initial ?? {
      usability: 0,
      usefulness: 0,
      satisfaction: 0,
      barriers: "",
    },
  });
  const status = useSave();
  const questions = [
    { key: "usability", label: "¿Ha sido fácil usar SIPA?" },
    {
      key: "usefulness",
      label: "¿Te resulta útil para gestionar las prácticas?",
    },
    { key: "satisfaction", label: "¿Estás satisfecho/a con la experiencia?" },
  ] as const;
  return (
    <form
      className="panel max-w-3xl space-y-5"
      onSubmit={handleSubmit(async (values) => {
        if (await status.save(() => savePilotAction(values))) reset(values);
      })}
    >
      <h2 className="font-semibold">Tu experiencia con SIPA</h2>
      <p className="hint">
        Una respuesta por persona, que puedes actualizar. Coordinación puede
        consultar y exportar las respuestas; no es una encuesta anónima.
      </p>
      {questions.map((q) => (
        <label className="field" key={q.key}>
          {q.label}
          <select
            className="select max-w-xs"
            {...register(q.key, { valueAsNumber: true })}
            required
          >
            <option value={0} disabled>
              Selecciona del 1 al 5
            </option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 1 ? " · Nada" : n === 5 ? " · Mucho" : ""}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="field">
        ¿Qué cambiarías o qué te ha dificultado usarlo?
        <textarea
          className="textarea"
          rows={4}
          maxLength={2000}
          {...register("barriers")}
        />
        <span className="hint">
          Opcional. Describe problemas de uso o mejoras, sin datos sensibles.
        </span>
      </label>
      <FormFooter
        pending={isSubmitting}
        dirty={isDirty}
        errors={errors}
        {...status}
        label={initial ? "Actualizar respuesta" : "Enviar respuesta"}
      />
    </form>
  );
}
