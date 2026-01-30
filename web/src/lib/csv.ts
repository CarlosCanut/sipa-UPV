import Papa from "papaparse";
import { z } from "zod";
import {
  companySchema,
  placementSchema,
  profileSchema,
  validationMessage,
} from "@/lib/editor-schemas";

export const importKindSchema = z.enum([
  "estudiantes",
  "tutores",
  "empresas",
  "plazas",
]);
export type ImportKind = z.infer<typeof importKindSchema>;
export const csvColumns: Record<ImportKind, string[]> = {
  estudiantes: [
    "email",
    "name",
    "program",
    "address",
    "lat",
    "lng",
    "maxDistanceKm",
    "priority",
  ],
  tutores: [
    "email",
    "name",
    "department",
    "address",
    "lat",
    "lng",
    "maxStudents",
  ],
  empresas: ["id", "name", "taxId"],
  plazas: [
    "id",
    "title",
    "companyId",
    "description",
    "seats",
    "address",
    "lat",
    "lng",
    "competencyFormId",
    "active",
    "requirements",
  ],
};
const profileImport = profileSchema.safeExtend({
  email: z.email().toLowerCase(),
});
const companyImport = companySchema.extend({ id: z.string().max(100) });
const placementImport = placementSchema.safeExtend({ id: z.string().max(100) });
export type ImportRow =
  | { kind: "estudiantes"; data: z.infer<typeof profileImport> }
  | { kind: "tutores"; data: z.infer<typeof profileImport> }
  | { kind: "empresas"; data: z.infer<typeof companyImport> }
  | { kind: "plazas"; data: z.infer<typeof placementImport> };

export function toCsv(rows: Record<string, unknown>[], columns?: string[]) {
  return (
    "\uFEFF" +
    Papa.unparse(columns ? { fields: columns, data: rows } : rows, {
      escapeFormulae: true,
    })
  );
}

export function parseImport(
  kind: ImportKind,
  source: string,
): { rows: ImportRow[]; errors: { row: number; message: string }[] } {
  if (source.length > 500_000)
    return { rows: [], errors: [{ row: 0, message: "El límite es 500 KB." }] };
  const result = Papa.parse<Record<string, string>>(
    source.replace(/^\uFEFF/, ""),
    {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      transform: (v) => v.trim(),
    },
  );
  const errors = result.errors.map((e) => ({
    row: (e.row ?? -1) + 2,
    message: e.message,
  }));
  if (!result.data.length || result.data.length > 500)
    errors.push({
      row: 0,
      message: "Importa entre 1 y 500 registros cada vez.",
    });
  const fields = result.meta.fields ?? [];
  if (
    csvColumns[kind].some((key) => !fields.includes(key)) ||
    fields.some((key) => !csvColumns[kind].includes(key))
  )
    errors.push({
      row: 1,
      message: `Usa estas columnas: ${csvColumns[kind].join(", ")}.`,
    });
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  const number = (value: string) => (value === "" ? null : Number(value));
  const boolean = (value: string) =>
    value === "true" ? true : value === "false" ? false : value;
  for (const [index, row] of result.data.entries()) {
    try {
      let parsed: ImportRow;
      if (kind === "estudiantes" || kind === "tutores") {
        parsed = {
          kind,
          data: profileImport.parse({
            program: "",
            department: "",
            ...row,
            lat: number(row.lat),
            lng: number(row.lng),
            maxDistanceKm:
              kind === "estudiantes" ? number(row.maxDistanceKm) : null,
            priority: kind === "estudiantes" ? boolean(row.priority) : false,
            maxStudents:
              kind === "tutores" ? Number(row.maxStudents || "NaN") : 8,
          }),
        };
      } else if (kind === "empresas")
        parsed = { kind, data: companyImport.parse(row) };
      else
        parsed = {
          kind,
          data: placementImport.parse({
            ...row,
            lat: number(row.lat),
            lng: number(row.lng),
            seats: Number(row.seats || "NaN"),
            active: boolean(row.active),
            requirements: JSON.parse(row.requirements || "{}"),
          }),
        };
      const key =
        "email" in parsed.data
          ? parsed.data.email
          : parsed.data.id ||
            ("taxId" in parsed.data
              ? parsed.data.taxId || parsed.data.name
              : `${parsed.data.companyId}:${parsed.data.title}`);
      if (seen.has(key))
        throw new Error("Registro repetido dentro del archivo.");
      seen.add(key);
      rows.push(parsed);
    } catch (error) {
      errors.push({
        row: index + 2,
        message:
          error instanceof z.ZodError
            ? validationMessage(error)
            : error instanceof SyntaxError
              ? "requirements debe ser un objeto JSON de niveles 1–5."
              : "Registro repetido dentro del archivo.",
      });
    }
  }
  return { rows, errors };
}

export type ImportResult = {
  error?: string;
  errors?: { row: number; message: string }[];
  count: number;
  committed?: boolean;
  preview?: { name: string; key: string }[];
};
