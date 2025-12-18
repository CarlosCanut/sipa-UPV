import "server-only";
import { Agent, fetch } from "undici";
import { db } from "@/lib/db";
import {
  instanceSchema,
  paramsSchema,
  type SolveInstance,
  type SimulationParams,
} from "@/lib/schemas";
import { validateResult } from "@/lib/solver-validation";
import { z } from "zod";

function solverUrl(path: string) {
  if (!process.env.SOLVER_URL) throw new Error("Falta SOLVER_URL.");
  return `${process.env.SOLVER_URL.replace(/\/$/, "")}${path}`;
}
function authHeaders() {
  return process.env.SOLVER_TOKEN
    ? { Authorization: `Bearer ${process.env.SOLVER_TOKEN}` }
    : {};
}
export async function getAlgorithms() {
  const response = await fetch(solverUrl("/algorithms"), {
    headers: authHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("No se pudo consultar el solver.");
  return z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        defaultParams: paramsSchema,
      }),
    )
    .parse(await response.json());
}
export async function buildInstance(
  simulationId: string,
  algorithm: string,
  params: SimulationParams,
) {
  const [students, placements, tutors] = await Promise.all([
    db.student.findMany({
      orderBy: { id: "asc" },
      include: {
        preferences: { orderBy: { rank: "asc" } },
        competencies: true,
      },
    }),
    db.placement.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      include: { requirements: true },
    }),
    db.tutor.findMany({ orderBy: { id: "asc" } }),
  ]);
  const activeIds = new Set(placements.map((p) => p.id));
  return instanceSchema.parse({
    simulationId,
    algorithm,
    params,
    students: students.map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      maxDistanceKm: s.maxDistanceKm,
      priority: s.priority,
      preferences: s.preferences
        .filter((p) => activeIds.has(p.placementId))
        .map((p) => p.placementId),
      competencies: Object.fromEntries(
        s.competencies.map((c) => [
          c.competencyId,
          { level: c.level, wantsToDevelop: c.wantsToDevelop },
        ]),
      ),
    })),
    placements: placements.map((p) => ({
      id: p.id,
      companyId: p.companyId,
      seats: p.seats,
      lat: p.lat,
      lng: p.lng,
      requirements: Object.fromEntries(
        p.requirements.map((r) => [r.competencyId, r.level]),
      ),
      dependsOn:
        p.dependsOnId && activeIds.has(p.dependsOnId) ? p.dependsOnId : null,
    })),
    tutors: tutors.map((t) => ({
      id: t.id,
      lat: t.lat,
      lng: t.lng,
      capacity: t.maxStudents,
    })),
  });
}
export async function callSolver(input: SolveInstance) {
  const dispatcher = new Agent({ headersTimeout: 0, bodyTimeout: 0 });
  try {
    const response = await fetch(solverUrl("/solve"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
      dispatcher,
      signal: AbortSignal.timeout((input.params.timeLimitSec + 60) * 1000),
    });
    if (!response.ok)
      throw new Error(`El solver devolvió un error (${response.status}).`);
    return validateResult(input, await response.json());
  } finally {
    await dispatcher.close();
  }
}
