"use client";
import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { exportCsvAction } from "@/app/export-actions";
import { Button } from "@/components/ui/button";

export function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ExportButton({
  kind,
  simulationId,
  label = "Descargar CSV",
}: {
  kind: Parameters<typeof exportCsvAction>[0];
  simulationId?: string;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            try {
              const result = await exportCsvAction(kind, simulationId);
              if (result.error) setError(result.error);
              else if (result.csv && result.filename)
                downloadCsv(result.csv, result.filename);
            } catch {
              setError("No se pudo descargar. Inténtalo de nuevo.");
            }
          })
        }
      >
        <Download />
        {pending ? "Preparando…" : label}
      </Button>
      {error && (
        <p role="alert" className="error-text mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
