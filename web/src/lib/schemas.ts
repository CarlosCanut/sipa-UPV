import { z } from "zod";

const weightsSchema = z
  .object({
    preference: z.number().min(0).max(1),
    competency: z.number().min(0).max(1),
    distance: z.number().min(0).max(1),
    development: z.number().min(0).max(1).default(0.1),
  })
  .refine(
    (w) => w.preference + w.competency + w.distance + w.development > 0,
    "Activa al menos un criterio.",
  );
export const paramsSchema = z.object({
  weights: weightsSchema,
  maxDistanceKm: z.number().positive().max(1000),
  assignTutors: z.boolean(),
  timeLimitSec: z.number().int().min(1).max(3600),
  seed: z.number().int().min(0).max(2147483647),
  tutorTravelWeight: z.number().min(0).max(1).default(0.5),
});
export type SimulationParams = z.infer<typeof paramsSchema>;
export const defaultParams: SimulationParams = {
  weights: {
    preference: 0.5,
    competency: 0.3,
    distance: 0.2,
    development: 0.1,
  },
  maxDistanceKm: 40,
  assignTutors: true,
  timeLimitSec: 300,
  seed: 1,
  tutorTravelWeight: 0.5,
};
export const simulationSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre.").max(100),
  algorithm: z.string().min(1).max(80),
  params: paramsSchema,
  parentId: z.string().optional(),
});
const coordinates = {
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
};
const locationSchema = z
  .object(coordinates)
  .refine(
    (v) => (v.lat === null) === (v.lng === null),
    "Completa ambas coordenadas.",
  );
// Anonymous instance sent to the assignment backend.
const studentRowSchema = locationSchema.safeExtend({
  id: z.string(),
  maxDistanceKm: z.number().positive().max(1000).nullable(),
  priority: z.boolean(),
  preferences: z.array(z.string()),
  competencies: z.record(
    z.string(),
    z.object({
      level: z.number().int().min(1).max(5),
      wantsToDevelop: z.boolean(),
    }),
  ),
});
const placementRowSchema = locationSchema.safeExtend({
  id: z.string(),
  companyId: z.string(),
  seats: z.number().int().nonnegative(),
  requirements: z.record(z.string(), z.number().int().min(1).max(5)),
  dependsOn: z.string().nullable(),
});
const tutorRowSchema = locationSchema.safeExtend({
  id: z.string(),
  capacity: z.number().int().nonnegative(),
});
export const instanceSchema = z.object({
  simulationId: z.string(),
  algorithm: z.string(),
  params: paramsSchema,
  students: z.array(studentRowSchema),
  placements: z.array(placementRowSchema),
  tutors: z.array(tutorRowSchema),
});
export type SolveInstance = z.infer<typeof instanceSchema>;
export const metricsSchema = z.object({
  firstChoicePct: z.number().min(0).max(100),
  avgPreferenceRank: z.number().nonnegative(),
  totalKm: z.number().nonnegative(),
  avgKm: z.number().nonnegative(),
  unassignedCount: z.number().int().nonnegative(),
  priorityAssignedPct: z.number().min(0).max(100),
  tutorLoadStdDev: z.number().nonnegative(),
});
export const solverResponseSchema = z.object({
  status: z.enum(["optimal", "feasible", "infeasible", "timeout"]),
  assignments: z.array(
    z.object({
      studentId: z.string(),
      placementId: z.string(),
      tutorId: z.string().nullable(),
      score: z.number().min(0).max(1),
      distanceKm: z.number().nonnegative(),
    }),
  ),
  unassigned: z.array(z.string()),
  metrics: metricsSchema,
  log: z.string().max(20000),
});
export const createUserSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe un nombre.").max(100),
    email: z.email("Correo no válido.").toLowerCase(),
    role: z.enum(["ADMIN", "STUDENT", "COMPANY", "TUTOR"]),
    companyId: z.string().optional(),
  })
  .refine((v) => v.role !== "COMPANY" || Boolean(v.companyId), {
    message: "Selecciona una empresa.",
    path: ["companyId"],
  });
export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12, "Usa al menos 12 caracteres.").max(128),
});
