"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import {
  importKindSchema,
  parseImport,
  type ImportRow,
  type ImportResult,
} from "@/lib/csv";
import { InputError, mutationError } from "@/lib/mutation-error";
import type { Prisma } from "@/generated/prisma/client";

async function checkRow(tx: Prisma.TransactionClient, row: ImportRow) {
  if (row.kind === "estudiantes" || row.kind === "tutores") {
    const actor = await tx.user.findUnique({
      where: { email: row.data.email },
      select: { role: true },
    });
    if (actor?.role !== (row.kind === "estudiantes" ? "STUDENT" : "TUTOR"))
      throw new InputError(
        "Crea primero una cuenta con este correo y el rol correcto desde Usuarios.",
      );
  } else if (row.kind === "empresas") {
    if (
      row.data.id &&
      !(await tx.company.count({ where: { id: row.data.id } }))
    )
      throw new InputError("Empresa desconocida. Deja id vacío para crearla.");
    if (
      row.data.taxId &&
      (await tx.company.count({
        where: { taxId: row.data.taxId, NOT: { id: row.data.id } },
      }))
    )
      throw new InputError("El CIF ya pertenece a otra empresa.");
  } else {
    const { id, companyId, competencyFormId, requirements } = row.data;
    const [existing, company, form] = await Promise.all([
      id ? tx.placement.findUnique({ where: { id } }) : null,
      tx.company.findUnique({ where: { id: companyId } }),
      tx.competencyForm.findUnique({
        where: { id: competencyFormId },
        include: { items: true },
      }),
    ]);
    if (id && !existing)
      throw new InputError("Plaza desconocida. Deja id vacío para crearla.");
    if (existing && existing.companyId !== companyId)
      throw new InputError(
        "No se puede cambiar la empresa de una plaza existente.",
      );
    if (!company || !form)
      throw new InputError(
        "companyId o competencyFormId no existe. Usa los identificadores del CSV actual.",
      );
    if (
      form.items.length !== Object.keys(requirements).length ||
      form.items.some((i) => requirements[i.competencyId] === undefined)
    )
      throw new InputError(
        "Los requisitos deben contener exactamente las competencias del formulario.",
      );
  }
}

async function writeRow(tx: Prisma.TransactionClient, row: ImportRow) {
  if (row.kind === "estudiantes" || row.kind === "tutores") {
    const {
      email,
      name,
      program,
      department,
      priority,
      maxStudents,
      maxDistanceKm,
      ...location
    } = row.data;
    await tx.user.update({
      where: { email },
      data: {
        name,
        ...(row.kind === "estudiantes"
          ? {
              student: {
                update: { ...location, program, priority, maxDistanceKm },
              },
            }
          : { tutor: { update: { ...location, department, maxStudents } } }),
      },
    });
  } else if (row.kind === "empresas") {
    const { id, name, taxId } = row.data;
    const data = { name, taxId: taxId || null };
    if (id) await tx.company.update({ where: { id }, data });
    else await tx.company.create({ data });
  } else {
    const { id, requirements, ...data } = row.data;
    const saved = id
      ? await tx.placement.update({ where: { id }, data })
      : await tx.placement.create({ data });
    await tx.placementRequirement.deleteMany({
      where: { placementId: saved.id },
    });
    await tx.placementRequirement.createMany({
      data: Object.entries(requirements).map(([competencyId, level]) => ({
        placementId: saved.id,
        competencyId,
        level,
      })),
    });
  }
}

export async function importCsvAction(
  kind: unknown,
  source: string,
  commit = false,
): Promise<ImportResult> {
  await requireRole("ADMIN");
  const parsedKind = importKindSchema.safeParse(kind);
  if (!parsedKind.success || typeof source !== "string")
    return { error: "Tipo de archivo no válido.", count: 0 };
  const parsed = parseImport(parsedKind.data, source);
  if (parsed.errors.length) return { errors: parsed.errors, count: 0 };
  try {
    const errors = await db.$transaction(
      async (tx) => {
        const errors: { row: number; message: string }[] = [];
        for (const [index, row] of parsed.rows.entries()) {
          try {
            await checkRow(tx, row);
          } catch (error) {
            if (!(error instanceof InputError)) throw error;
            errors.push({ row: index + 2, message: error.message });
          }
        }
        if (errors.length || !commit) return errors;
        for (const row of parsed.rows) await writeRow(tx, row);
        return errors;
      },
      { timeout: 30_000 },
    );
    if (errors.length) return { errors, count: 0 };
    if (commit) revalidatePath("/", "layout");
    return {
      count: parsed.rows.length,
      committed: commit,
      preview: parsed.rows
        .slice(0, 10)
        .map((r) => ({
          name: "name" in r.data ? r.data.name : r.data.title,
          key: "email" in r.data ? r.data.email : r.data.id || "Nuevo registro",
        })),
    };
  } catch (error) {
    return { ...mutationError(error), count: 0 };
  }
}
