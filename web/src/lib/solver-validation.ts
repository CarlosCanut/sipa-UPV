import { solverResponseSchema, type SolveInstance } from "@/lib/schemas";

export function validateResult(input: SolveInstance, value: unknown) {
  const response = solverResponseSchema.parse(value);
  const students = new Map(input.students.map((s) => [s.id, s]));
  const placements = new Map(input.placements.map((p) => [p.id, p]));
  const tutors = new Map(input.tutors.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const placementLoads = new Map<string, number>();
  const tutorLoads = new Map<string, number>();
  for (const row of response.assignments) {
    const student = students.get(row.studentId);
    const placement = placements.get(row.placementId);
    if (!student || !placement || seen.has(row.studentId))
      throw new Error("Asignación desconocida o duplicada.");
    seen.add(row.studentId);
    const load = (placementLoads.get(placement.id) ?? 0) + 1;
    placementLoads.set(placement.id, load);
    if (load > placement.seats)
      throw new Error("Capacidad de plazas superada.");
    if (
      row.distanceKm >
      Math.min(
        student.maxDistanceKm ?? input.params.maxDistanceKm,
        input.params.maxDistanceKm,
      ) +
        0.01
    )
      throw new Error("Distancia máxima superada.");
    if (input.params.assignTutors !== Boolean(row.tutorId))
      throw new Error("Asignación de tutor incompleta.");
    if (row.tutorId) {
      const tutor = tutors.get(row.tutorId);
      const load = (tutorLoads.get(row.tutorId) ?? 0) + 1;
      tutorLoads.set(row.tutorId, load);
      if (!tutor || load > tutor.capacity)
        throw new Error("Tutor desconocido o sin capacidad.");
      if (tutor.lat === null || tutor.lng === null)
        throw new Error("Tutor sin ubicación.");
    }
  }
  for (const placement of input.placements) {
    if (
      placementLoads.has(placement.id) &&
      placement.dependsOn &&
      !placementLoads.has(placement.dependsOn)
    )
      throw new Error("Dependencia entre plazas incumplida.");
  }
  for (const id of response.unassigned) {
    if (!students.has(id) || seen.has(id))
      throw new Error("Estudiante desconocido o duplicado.");
    seen.add(id);
  }
  if (
    seen.size !== students.size ||
    response.metrics.unassignedCount !== response.unassigned.length
  )
    throw new Error("Resultado incompleto.");
  return response;
}
