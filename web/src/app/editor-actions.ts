"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { checkPlacementChanges } from "@/lib/placement-dependencies";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { assignmentScope } from "@/lib/assignment-scope";
import { InputError, mutationError } from "@/lib/mutation-error";
import {
  companySchema,
  competencySchema,
  competencyFormSchema,
  feedbackSchema,
  pilotSchema,
  placementSchema,
  preferencesSchema,
  profileSchema,
  validationMessage,
} from "@/lib/editor-schemas";

export async function saveProfileAction(value: unknown, targetUserId?: string) {
  const { user } = await requireRole();
  if (targetUserId && targetUserId !== user.id && user.role !== "ADMIN")
    return { error: "No puedes editar este perfil." };
  const parsed = profileSchema.safeParse(value);
  if (!parsed.success) return { error: validationMessage(parsed.error) };
  const id = targetUserId ?? user.id;
  const p = parsed.data;
  try {
    await db.$transaction(async (tx) => {
      const target = await tx.user.findUniqueOrThrow({ where: { id } });
      if (target.role !== "STUDENT" || user.role === "ADMIN")
        await tx.user.update({ where: { id }, data: { name: p.name } });
      const location = { address: p.address, lat: p.lat, lng: p.lng };
      if (target.role === "STUDENT")
        await tx.student.update({
          where: { userId: id },
          data: {
            ...location,
            maxDistanceKm: p.maxDistanceKm,
            ...(user.role === "ADMIN"
              ? { program: p.program, priority: p.priority }
              : {}),
          },
        });
      if (target.role === "TUTOR")
        await tx.tutor.update({
          where: { userId: id },
          data: {
            ...location,
            department: p.department,
            maxStudents: p.maxStudents,
          },
        });
    });
  } catch (error) {
    return mutationError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveCompanyAction(value: unknown, id?: string) {
  const { user } = await requireRole("ADMIN", "COMPANY");
  const parsed = companySchema.safeParse(value);
  if (!parsed.success) return { error: validationMessage(parsed.error) };
  try {
    if (user.role === "COMPANY") {
      const account = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      if (!id || account.companyId !== id)
        return { error: "No puedes editar esta empresa." };
    }
    const data = { ...parsed.data, taxId: parsed.data.taxId || null };
    const company = id
      ? await db.company.update({ where: { id }, data })
      : await db.company.create({ data });
    revalidatePath("/", "layout");
    return { ok: true, id: company.id };
  } catch (error) {
    return mutationError(error);
  }
}

export async function savePlacementAction(value: unknown, id?: string) {
  const { user } = await requireRole("ADMIN", "COMPANY");
  const parsed = placementSchema.safeParse(value);
  if (!parsed.success) return { error: validationMessage(parsed.error) };
  try {
    const placement = await db.$transaction(async (tx) => {
      const actor = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      const existing = id
        ? await tx.placement.findUniqueOrThrow({ where: { id } })
        : null;
      if (
        user.role === "COMPANY" &&
        (actor.companyId !== parsed.data.companyId ||
          (existing && existing.companyId !== actor.companyId))
      )
        throw new InputError("No puedes editar esta plaza.");
      if (existing && existing.companyId !== parsed.data.companyId)
        throw new InputError(
          "Una plaza con historial no puede cambiar de empresa.",
        );
      const form = await tx.competencyForm.findUniqueOrThrow({
        where: { id: parsed.data.competencyFormId },
        include: { items: true },
      });
      const { requirements, ...data } = parsed.data;
      const savedId = id ?? randomUUID();
      await checkPlacementChanges(tx, [{ ...data, id: savedId }]);
      const keys = Object.keys(requirements);
      if (
        keys.length !== form.items.length ||
        form.items.some((i) => !keys.includes(i.competencyId))
      )
        throw new InputError(
          "Completa los niveles de todas las competencias del formulario.",
        );
      const saved = id
        ? await tx.placement.update({ where: { id }, data })
        : await tx.placement.create({ data: { ...data, id: savedId } });
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
      return saved;
    });
    revalidatePath("/", "layout");
    return { ok: true, id: placement.id };
  } catch (error) {
    return mutationError(error);
  }
}

export async function savePreferencesAction(value: unknown) {
  const { user } = await requireRole("STUDENT");
  const parsed = preferencesSchema.safeParse(value);
  if (!parsed.success) return { error: validationMessage(parsed.error) };
  try {
    await db.$transaction(async (tx) => {
      const student = await tx.student.findUniqueOrThrow({
        where: { userId: user.id },
      });
      const { placementIds, competencies } = parsed.data;
      if (
        (await tx.placement.count({
          where: { id: { in: placementIds }, active: true, seats: { gt: 0 } },
        })) !== placementIds.length
      )
        throw new InputError(
          "Una de las ofertas ya no está disponible. Recarga la página y revisa tus preferencias.",
        );
      if (
        (await tx.competency.count({
          where: { id: { in: Object.keys(competencies) } },
        })) !== Object.keys(competencies).length
      )
        throw new InputError(
          "Las competencias han cambiado. Recarga la página.",
        );
      await tx.studentPreference.deleteMany({
        where: { studentId: student.id },
      });
      await tx.studentPreference.createMany({
        data: placementIds.map((placementId, i) => ({
          studentId: student.id,
          placementId,
          rank: i + 1,
        })),
      });
      for (const [competencyId, data] of Object.entries(competencies))
        await tx.studentCompetency.upsert({
          where: {
            studentId_competencyId: { studentId: student.id, competencyId },
          },
          create: { studentId: student.id, competencyId, ...data },
          update: data,
        });
    });
  } catch (error) {
    return mutationError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveCatalogAction(
  kind: "competency" | "form",
  value: unknown,
  id?: string,
) {
  await requireRole("ADMIN");
  try {
    if (kind === "competency") {
      const parsed = competencySchema.safeParse(value);
      if (!parsed.success) return { error: validationMessage(parsed.error) };
      if (id) await db.competency.update({ where: { id }, data: parsed.data });
      else await db.competency.create({ data: parsed.data });
    } else if (kind === "form") {
      const parsed = competencyFormSchema.safeParse(value);
      if (!parsed.success) return { error: validationMessage(parsed.error) };
      const { competencyIds, ...data } = parsed.data;
      await db.$transaction(async (tx) => {
        const existing = id
          ? await tx.competencyForm.findUniqueOrThrow({
              where: { id },
              include: {
                items: true,
                _count: { select: { placements: true } },
              },
            })
          : null;
        if (
          existing?._count.placements &&
          (existing.items.length !== competencyIds.length ||
            existing.items.some((i) => !competencyIds.includes(i.competencyId)))
        )
          throw new InputError(
            "Este formulario ya se usa en plazas. Crea otro para cambiar sus competencias.",
          );
        const saved = id
          ? await tx.competencyForm.update({ where: { id }, data })
          : await tx.competencyForm.create({ data });
        await tx.competencyFormItem.deleteMany({ where: { formId: saved.id } });
        await tx.competencyFormItem.createMany({
          data: competencyIds.map((competencyId, position) => ({
            formId: saved.id,
            competencyId,
            position,
          })),
        });
      });
    } else return { error: "Tipo de catálogo no válido." };
  } catch (error) {
    return mutationError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCatalogAction(
  kind: "competency" | "form",
  id: string,
) {
  await requireRole("ADMIN");
  try {
    if (kind === "competency") await db.competency.delete({ where: { id } });
    else if (kind === "form") await db.competencyForm.delete({ where: { id } });
    else return { error: "Tipo de catálogo no válido." };
  } catch (error) {
    return mutationError(error);
  }
  revalidatePath("/opciones/competencias");
  return { ok: true };
}

export async function saveFeedbackAction(value: unknown) {
  const { user } = await requireRole("STUDENT", "COMPANY", "TUTOR");
  const parsed = feedbackSchema.safeParse(value);
  if (!parsed.success) return { error: validationMessage(parsed.error) };
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740112)`;
      const actor = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      const assignment = await tx.assignment.findFirst({
        where: {
          id: parsed.data.assignmentId,
          simulation: { publishedAt: { not: null } },
          ...assignmentScope(actor),
        },
      });
      if (!assignment)
        throw new InputError("Esta asignación no está publicada para ti.");
      const { assignmentId, rating, comment } = parsed.data;
      await tx.assignmentFeedback.upsert({
        where: { assignmentId_userId: { assignmentId, userId: user.id } },
        create: { assignmentId, userId: user.id, rating, comment },
        update: { rating, comment },
      });
    });
  } catch (error) {
    return mutationError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function savePilotAction(value: unknown) {
  const { user } = await requireRole();
  const parsed = pilotSchema.safeParse(value);
  if (!parsed.success) return { error: validationMessage(parsed.error) };
  try {
    await db.pilotResponse.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...parsed.data },
      update: parsed.data,
    });
  } catch (error) {
    return mutationError(error);
  }
  revalidatePath("/evaluacion");
  return { ok: true };
}
