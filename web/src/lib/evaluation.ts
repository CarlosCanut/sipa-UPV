import { instanceSchema } from "@/lib/schemas";

type Result = {
  studentId: string;
  placementId: string | null;
  tutorId: string | null;
};
function distance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function evaluateScenario(input: unknown, assignments: Result[]) {
  const parsed = instanceSchema.safeParse(input);
  if (!parsed.success) return null;
  const { students, placements, tutors, params } = parsed.data;
  const assigned = new Set(
    assignments.filter((a) => a.placementId).map((a) => a.studentId),
  );
  const priority = students.filter((s) => s.priority);
  const others = students.filter((s) => !s.priority);
  const pct = (group: typeof students) =>
    group.length
      ? (100 * group.filter((s) => assigned.has(s.id)).length) / group.length
      : null;
  const edges = new Set<string>();
  let tutorVisitKm: number | null = params.assignTutors ? 0 : null;
  for (const a of assignments) {
    if (!a.placementId || !a.tutorId) continue;
    const key = `${a.tutorId}:${a.placementId}`;
    if (edges.has(key)) continue;
    edges.add(key);
    const t = tutors.find((t) => t.id === a.tutorId);
    const p = placements.find((p) => p.id === a.placementId);
    if (t?.lat == null || t.lng == null || p?.lat == null || p.lng == null) {
      tutorVisitKm = null;
      break;
    }
    tutorVisitKm =
      (tutorVisitKm ?? 0) +
      distance({ lat: t.lat, lng: t.lng }, { lat: p.lat, lng: p.lng });
  }
  return {
    assigned: assigned.size,
    total: students.length,
    priorityCount: priority.length,
    priorityAssignedPct: pct(priority),
    otherAssignedPct: pct(others),
    tutorVisitKm,
    dataset: JSON.stringify({ students, placements, tutors }),
  };
}
