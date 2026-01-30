import type { Student, Tutor, User } from "@/generated/prisma/client";
import type { ProfileValues } from "@/lib/editor-schemas";

export function profileValues(
  user: User & { student: Student | null; tutor: Tutor | null },
): ProfileValues {
  const actor = user.student ?? user.tutor;
  return {
    name: user.name,
    address: actor?.address ?? "",
    lat: actor?.lat ?? null,
    lng: actor?.lng ?? null,
    program: user.student?.program ?? "",
    department: user.tutor?.department ?? "",
    maxDistanceKm: user.student?.maxDistanceKm ?? null,
    maxStudents: user.tutor?.maxStudents ?? 8,
    priority: user.student?.priority ?? false,
  };
}
