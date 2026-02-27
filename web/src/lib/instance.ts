import type { PrismaClient } from "../generated/prisma/client";
import { instanceSchema, type SimulationParams } from "./schemas";

export async function buildInstance(
  db: PrismaClient,
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
      dependsOn: p.dependsOnId,
    })),
    tutors: tutors.map((t) => ({
      id: t.id,
      lat: t.lat,
      lng: t.lng,
      capacity: t.maxStudents,
    })),
  });
}
