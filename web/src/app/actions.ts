"use server";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getAuth } from "@/lib/auth";
import {
  createUserSchema,
  passwordSchema,
  simulationSchema,
} from "@/lib/schemas";
import { launch, publish } from "@/lib/simulations";
import { getAlgorithms } from "@/lib/solver";

export async function launchAction(value: unknown) {
  const { user } = await requireRole("ADMIN");
  const data = simulationSchema.safeParse(value);
  if (!data.success)
    return { error: "Revisa los parámetros de la simulación." };
  try {
    if (!(await getAlgorithms()).some((a) => a.key === data.data.algorithm))
      return { error: "Algoritmo no disponible." };
    const id = await launch(user.id, data.data);
    revalidatePath("/simulaciones");
    return { id };
  } catch {
    return {
      error:
        "No se pudo iniciar. Revisa los datos y la conexión con el solver.",
    };
  }
}
export async function publishAction(id: string) {
  await requireRole("ADMIN");
  try {
    await publish(z.string().min(1).parse(id));
  } catch {
    return { error: "No se pudo publicar esta simulación." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function createUserAction(value: unknown) {
  await requireRole("ADMIN");
  const parsed = createUserSchema.safeParse(value);
  if (!parsed.success)
    return { error: "Revisa el nombre, correo, rol y empresa." };
  const { name, email, role, companyId } = parsed.data;
  const password = randomBytes(18).toString("base64url");
  const hash = await hashPassword(password);
  try {
    await db.$transaction(async (tx) => {
      const id = randomUUID();
      await tx.user.create({
        data: {
          id,
          name,
          email,
          role,
          companyId: role === "COMPANY" ? companyId : null,
          student: role === "STUDENT" ? { create: { address: "" } } : undefined,
          tutor: role === "TUTOR" ? { create: { address: "" } } : undefined,
        },
      });
      await tx.account.create({
        data: {
          id: randomUUID(),
          accountId: id,
          userId: id,
          providerId: "credential",
          password: hash,
        },
      });
    });
  } catch (error) {
    return {
      error:
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
          ? "Ya existe un usuario con ese correo."
          : "No se pudo crear el usuario.",
    };
  }
  revalidatePath("/opciones/usuarios");
  return { password };
}
export async function changePasswordAction(value: unknown) {
  await requireRole();
  const result = passwordSchema.safeParse(value);
  if (!result.success)
    return {
      error: "La nueva contraseña debe tener entre 12 y 128 caracteres.",
    };
  try {
    await getAuth().api.changePassword({
      headers: await headers(),
      body: { ...result.data, revokeOtherSessions: true },
    });
  } catch {
    return { error: "No se pudo cambiar. Comprueba la contraseña actual." };
  }
  return { ok: true };
}
export async function readNotificationAction(form: FormData) {
  const { user } = await requireRole();
  const id = z.string().parse(form.get("id"));
  const notification = await db.notification.findFirst({
    where: { id, userId: user.id },
  });
  if (!notification) return;
  await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
  redirect(
    notification.href?.startsWith("/") && !notification.href.startsWith("//")
      ? notification.href
      : "/",
  );
}
export async function signOutAction() {
  await requireRole();
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/login");
}
