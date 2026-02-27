import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { buildInstance, callSolver } from "@/lib/solver";
import { instanceSchema, paramsSchema, simulationSchema } from "@/lib/schemas";
import { validateResult } from "@/lib/solver-validation";

export async function launch(createdById: string, value: unknown) {
  const data = simulationSchema.parse(value);
  if (data.parentId)
    await db.simulation.findUniqueOrThrow({ where: { id: data.parentId } });
  const id = randomUUID();
  const input = await buildInstance(id, data.algorithm, data.params);
  await db.simulation.create({
    data: { ...data, id, input, createdById, status: "RUNNING" },
  });
  after(() => runSimulation(id));
  return id;
}
async function complete(id: string, value: unknown) {
  await db.$transaction(async (tx) => {
    const simulation = await tx.simulation.findUniqueOrThrow({ where: { id } });
    const response = validateResult(
      instanceSchema.parse(simulation.input),
      value,
    );
    // Claim the RUNNING row: stale detection or duplicate completion cannot overwrite a terminal state.
    const claim = await tx.simulation.updateMany({
      where: { id, status: "RUNNING" },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        metrics: {
          ...response.metrics,
          solverStatus: response.status,
          log: response.log,
        },
      },
    });
    if (!claim.count) return;
    await tx.assignment.createMany({
      data: [
        ...response.assignments.map((a) => ({ ...a, simulationId: id })),
        ...response.unassigned.map((studentId) => ({
          studentId,
          simulationId: id,
          placementId: null,
        })),
      ],
    });
    await tx.notification.create({
      data: {
        userId: simulation.createdById,
        type: "SIMULATION_COMPLETED",
        title: `Completada: ${simulation.name}`,
        href: `/simulaciones/${id}`,
      },
    });
  });
}
async function fail(id: string, message: string) {
  await db.$transaction(async (tx) => {
    const simulation = await tx.simulation.findUniqueOrThrow({ where: { id } });
    const changed = await tx.simulation.updateMany({
      where: { id, status: "RUNNING" },
      data: {
        status: "FAILED",
        error: message.slice(0, 200),
        finishedAt: new Date(),
      },
    });
    if (changed.count)
      await tx.notification.create({
        data: {
          userId: simulation.createdById,
          type: "SIMULATION_FAILED",
          title: `Error: ${simulation.name}`,
          href: `/simulaciones/${id}`,
        },
      });
  });
}
async function runSimulation(id: string) {
  try {
    const row = await db.simulation.findUniqueOrThrow({ where: { id } });
    await complete(id, await callSolver(instanceSchema.parse(row.input)));
  } catch (error) {
    console.error(
      "Simulation failed",
      id,
      error instanceof Error ? error.name : "UnknownError",
    );
    await fail(
      id,
      "No se pudo completar la simulación. Comprueba el servicio de asignación y relánzala.",
    );
  }
}
export async function failStale() {
  const running = await db.simulation.findMany({
    where: { status: "RUNNING" },
    select: { id: true, createdAt: true, params: true },
  });
  for (const row of running) {
    const result = paramsSchema.safeParse(row.params);
    const limit = result.success ? result.data.timeLimitSec : 300;
    if (Date.now() - row.createdAt.getTime() > (limit + 300) * 1000)
      await fail(row.id, "Interrumpida, relánzala");
  }
}
export async function publish(id: string) {
  await db.$transaction(async (tx) => {
    // Serialize concurrent publish requests without changing the provided schema.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(740112)`;
    const simulation = await tx.simulation.findUniqueOrThrow({
      where: { id },
      include: {
        assignments: {
          include: {
            student: true,
            tutor: true,
            placement: {
              include: {
                company: { include: { users: { where: { role: "COMPANY" } } } },
              },
            },
          },
        },
      },
    });
    if (simulation.status !== "COMPLETED")
      throw new Error("Solo se pueden publicar simulaciones completadas.");
    if (simulation.publishedAt) return;
    await tx.simulation.updateMany({
      where: { publishedAt: { not: null } },
      data: { publishedAt: null },
    });
    await tx.simulation.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
    const recipients = new Map<string, string>();
    for (const row of simulation.assignments) {
      recipients.set(row.student.userId, "/mi-asignacion");
      if (row.tutor) recipients.set(row.tutor.userId, "/mis-estudiantes");
      for (const user of row.placement?.company.users ?? [])
        recipients.set(user.id, "/asignados");
    }
    if (recipients.size)
      await tx.notification.createMany({
        data: [...recipients].map(([userId, href]) => ({
          userId,
          href,
          type: "ASSIGNMENT_PUBLISHED",
          title: "Tu asignación de prácticas ya está disponible.",
        })),
      });
  });
}
