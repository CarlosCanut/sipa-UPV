"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { importCsvAction } from "@/app/import-actions";
import { csvColumns, toCsv, type ImportKind } from "@/lib/csv";
import { ExportButton, downloadCsv } from "@/components/export-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImportForm() {
  const [kind, setKind] = useState<ImportKind>("estudiantes");
  const [source, setSource] = useState("");
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof importCsvAction>
  > | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const run = (commit: boolean) =>
    start(async () => {
      setError("");
      try {
        setResult(await importCsvAction(kind, source, commit));
      } catch {
        setError("No se pudo procesar el archivo. Inténtalo de nuevo.");
      }
    });
  return (
    <div className="max-w-4xl space-y-6">
      <section className="panel space-y-5">
        <label className="field">
          Tipo de datos
          <select
            className="select max-w-sm"
            value={kind}
            disabled={pending}
            onChange={(e) => {
              setKind(e.target.value as ImportKind);
              setSource("");
              setResult(null);
              setError("");
            }}
          >
            {Object.keys(csvColumns).map((key) => (
              <option value={key} key={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-muted-foreground">
          Descarga los datos actuales, edita el archivo y revísalo antes de
          importar. Los registros se actualizan por correo o id; no se borran
          registros ausentes.
        </p>
        <div className="flex flex-wrap gap-3">
          <ExportButton kind={kind} label="Descargar datos actuales" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(toCsv([], csvColumns[kind]), `plantilla-${kind}.csv`)
            }
          >
            Plantilla vacía
          </Button>
        </div>
        <p className="hint">
          {kind === "estudiantes" || kind === "tutores" ? (
            <>
              Crea primero las cuentas en{" "}
              <Link
                href="/opciones/usuarios"
                className="text-primary underline"
              >
                Usuarios
              </Link>
              . Este CSV completa sus fichas sin cambiar contraseñas.
            </>
          ) : kind === "empresas" ? (
            "Deja id vacío para crear una empresa o conserva el id para actualizarla."
          ) : (
            "Deja id vacío para crear un registro. En las ofertas usa companyId y competencyFormId existentes; requirements es un objeto JSON con identificadores de competencias y niveles 1–5."
          )}{" "}
          Usa punto decimal y true/false para los indicadores. Máximo 500
          registros y 500 KB.
        </p>
        <label className="field">
          Archivo CSV
          <Input
            key={kind}
            type="file"
            accept=".csv,text/csv"
            disabled={pending}
            onChange={async (event) => {
              setResult(null);
              setSource("");
              setError("");
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 500_000) {
                setError("El límite es 500 KB.");
                return;
              }
              try {
                setSource(await file.text());
              } catch {
                setError("No se pudo leer el archivo.");
              }
            }}
          />
        </label>
        <Button disabled={!source || pending} onClick={() => run(false)}>
          {pending ? "Procesando…" : "Revisar archivo"}
        </Button>
      </section>
      {(error || result?.error) && (
        <p className="error-text" role="alert">
          {error || result?.error}
        </p>
      )}
      {result?.errors && (
        <section className="panel" role="alert">
          <h2 className="font-semibold">
            Corrige estos errores y vuelve a cargar el archivo
          </h2>
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
            {result.errors.map((e, i) => (
              <li key={i}>
                Fila {e.row}: {e.message}
              </li>
            ))}
          </ul>
          <p className="hint mt-4">No se ha guardado ningún cambio.</p>
        </section>
      )}
      {result?.preview && (
        <section className="panel space-y-5">
          <h2 className="font-semibold">
            {result.committed ? "Importación completada" : "Vista previa"} ·{" "}
            {result.count} registros
          </h2>
          <ul className="divide-y text-sm">
            {result.preview.map((r, i) => (
              <li className="flex flex-wrap justify-between gap-2 py-3" key={i}>
                <span>{r.name}</span>
                <span className="text-muted-foreground">{r.key}</span>
              </li>
            ))}
          </ul>
          {result.count > 10 && (
            <p className="hint">Se muestran los primeros 10 registros.</p>
          )}
          {result.committed ? (
            <p role="status" className="text-sm text-primary">
              Datos guardados.{" "}
              <Link className="underline" href={`/datos?tab=${kind}`}>
                Ver registros
              </Link>
            </p>
          ) : (
            <>
              <p className="hint">
                Se guardarán todos los registros en una sola operación,
                únicamente si siguen siendo válidos.
              </p>
              <Button disabled={pending} onClick={() => run(true)}>
                {pending ? "Importando…" : `Importar ${result.count} registros`}
              </Button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
