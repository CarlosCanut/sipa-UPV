"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";

export function useSave() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function save(
    action: () => Promise<{ error?: string; ok?: boolean; id?: string }>,
    destination?: (id: string) => string,
  ) {
    setMessage("");
    try {
      const result = await action();
      setError(Boolean(result.error));
      setMessage(result.error ?? "Cambios guardados.");
      if (result.error) return false;
      if (destination && result.id) router.replace(destination(result.id));
      router.refresh();
      return true;
    } catch {
      setError(true);
      setMessage(
        "No se pudo conectar. Tus cambios siguen aquí; vuelve a intentarlo.",
      );
      return false;
    }
  }
  return { save, message, error };
}

export function FormFooter({
  pending,
  dirty,
  errors,
  message,
  error,
  label = "Guardar cambios",
}: {
  pending: boolean;
  dirty: boolean;
  errors: FieldErrors;
  message: string;
  error: boolean;
  label?: string;
}) {
  const messages = new Set<string>();
  function collect(value: unknown) {
    if (!value || typeof value !== "object") return;
    if ("message" in value && typeof value.message === "string")
      messages.add(value.message);
    else
      for (const [key, child] of Object.entries(value))
        if (key !== "ref") collect(child);
  }
  collect(errors);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <div className="space-y-3 border-t pt-5 md:col-span-2">
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="error-text">
          {messages.size
            ? [...messages].join(" · ")
            : "Revisa los campos obligatorios y los límites indicados."}
        </p>
      )}
      {message && (
        <p
          role="status"
          className={error ? "error-text" : "text-sm text-primary"}
        >
          {message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button disabled={pending}>{pending ? "Guardando…" : label}</Button>
        {dirty && <span className="hint">Tienes cambios sin guardar.</span>}
      </div>
    </div>
  );
}

export const nullableNumber = (value: string) =>
  value === "" ? null : Number(value);
