"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { csvColumns, toCsv } from "@/lib/csv";
import { evaluateScenario } from "@/lib/evaluation";

const kindSchema = z.enum([
  "estudiantes",
  "tutores",
  "empresas",
  "plazas",
  "assignments",
  "metrics",
  "feedback",
  "pilot",
]);
export async function exportCsvAction(
  kind: z.infer<typeof kindSchema>,
  simulationId?: string,
) {
  await requireRole("ADMIN");
  if (!kindSchema.safeParse(kind).success)
    return { error: "Exportación no disponible." };
  let rows: Record<string, unknown>[];
  let columns: string[] | undefined;
  switch (kind) {
    case "estudiantes": {
      rows = (
        await db.student.findMany({
          include: { user: true },
          orderBy: { id: "asc" },
        })
      ).map((s) => ({
        email: s.user.email,
        name: s.user.name,
        program: s.program ?? "",
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        maxDistanceKm: s.maxDistanceKm,
        priority: s.priority,
      }));
      columns = csvColumns[kind];
      break;
    }
    case "tutores": {
      rows = (
        await db.tutor.findMany({
          include: { user: true },
          orderBy: { id: "asc" },
        })
      ).map((t) => ({
        email: t.user.email,
        name: t.user.name,
        department: t.department ?? "",
        address: t.address,
        lat: t.lat,
        lng: t.lng,
        maxStudents: t.maxStudents,
      }));
      columns = csvColumns[kind];
      break;
    }
    case "empresas": {
      rows = await db.company.findMany({
        select: { id: true, name: true, taxId: true },
        orderBy: { id: "asc" },
      });
      columns = csvColumns[kind];
      break;
    }
    case "plazas": {
      rows = (
        await db.placement.findMany({
          include: { requirements: true },
          orderBy: { id: "asc" },
        })
      ).map((p) => ({
        id: p.id,
        title: p.title,
        companyId: p.companyId,
        description: p.description ?? "",
        seats: p.seats,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        competencyFormId: p.competencyFormId,
        active: p.active,
        requirements: JSON.stringify(
          Object.fromEntries(
            p.requirements.map((r) => [r.competencyId, r.level]),
          ),
        ),
      }));
      columns = csvColumns[kind];
      break;
    }
    case "pilot": {
      columns = [
        "respondentId",
        "role",
        "usability",
        "usefulness",
        "satisfaction",
        "barriers",
        "updatedAt",
      ];
      rows = (
        await db.pilotResponse.findMany({
          include: { user: { select: { role: true } } },
        })
      ).map((r) => ({
        respondentId: r.userId,
        role: r.user.role,
        usability: r.usability,
        usefulness: r.usefulness,
        satisfaction: r.satisfaction,
        barriers: r.barriers,
        updatedAt: r.updatedAt.toISOString(),
      }));
      break;
    }
    default: {
      if (!simulationId) return { error: "Selecciona una simulación." };
      const simulation = await db.simulation.findUnique({
        where: { id: simulationId },
        include: {
          assignments: {
            include: {
              student: { include: { user: true } },
              placement: { include: { company: true } },
              tutor: { include: { user: true } },
              feedback: { include: { user: { select: { role: true } } } },
            },
          },
        },
      });
      if (!simulation || simulation.status !== "COMPLETED")
        return { error: "La simulación aún no tiene resultados." };
      if (kind === "assignments") {
        columns = [
          "simulationId",
          "assignmentId",
          "studentId",
          "student",
          "email",
          "placementId",
          "placement",
          "company",
          "tutorId",
          "tutor",
          "score",
          "distanceKm",
        ];
        rows = simulation.assignments.map((a) => ({
          simulationId,
          assignmentId: a.id,
          studentId: a.studentId,
          student: a.student.user.name,
          email: a.student.user.email,
          placementId: a.placementId,
          placement: a.placement?.title,
          company: a.placement?.company.name,
          tutorId: a.tutorId,
          tutor: a.tutor?.user.name,
          score: a.score,
          distanceKm: a.distanceKm,
        }));
      } else if (kind === "feedback") {
        columns = [
          "simulationId",
          "assignmentId",
          "respondentId",
          "role",
          "rating",
          "comment",
          "updatedAt",
        ];
        rows = simulation.assignments.flatMap((a) =>
          a.feedback.map((f) => ({
            simulationId,
            assignmentId: a.id,
            respondentId: f.userId,
            role: f.user.role,
            rating: f.rating,
            comment: f.comment,
            updatedAt: f.updatedAt.toISOString(),
          })),
        );
      } else {
        const evaluation = evaluateScenario(
          simulation.input,
          simulation.assignments,
        );
        const metrics =
          simulation.metrics &&
          typeof simulation.metrics === "object" &&
          !Array.isArray(simulation.metrics)
            ? simulation.metrics
            : {};
        rows = [
          {
            simulationId,
            name: simulation.name,
            algorithm: simulation.algorithm,
            params: JSON.stringify(simulation.params),
            createdAt: simulation.createdAt.toISOString(),
            finishedAt: simulation.finishedAt?.toISOString(),
            publishedAt: simulation.publishedAt?.toISOString(),
            ...metrics,
            priorityCount: evaluation?.priorityCount,
            otherAssignedPct: evaluation?.otherAssignedPct,
            tutorVisitKm: evaluation?.tutorVisitKm,
          },
        ];
      }
    }
  }
  return {
    csv: toCsv(rows, columns),
    filename: `sipa-${kind}${simulationId ? `-${simulationId}` : ""}.csv`,
  };
}
