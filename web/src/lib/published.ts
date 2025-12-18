import "server-only";
import type { Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
export async function publishedAssignments(userId: string, role: Role) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { companyId: true },
  });
  if (role === "COMPANY" && !user.companyId) return [];
  const scope =
    role === "STUDENT"
      ? { student: { userId } }
      : role === "TUTOR"
        ? { tutor: { userId } }
        : role === "COMPANY"
          ? { placement: { companyId: user.companyId! } }
          : { id: "" };
  return db.assignment.findMany({
    where: { simulation: { publishedAt: { not: null } }, ...scope },
    include: {
      student: { include: { user: true } },
      placement: { include: { company: true } },
      tutor: { include: { user: true } },
    },
    orderBy: { student: { user: { name: "asc" } } },
  });
}
