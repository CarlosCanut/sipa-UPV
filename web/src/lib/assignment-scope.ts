import type { Prisma, Role } from "@/generated/prisma/client";

export function assignmentScope(user: {
  id: string;
  role: Role;
  companyId: string | null;
}): Prisma.AssignmentWhereInput {
  switch (user.role) {
    case "ADMIN":
      return {};
    case "STUDENT":
      return { student: { userId: user.id } };
    case "TUTOR":
      return { tutor: { userId: user.id } };
    case "COMPANY":
      return user.companyId
        ? { placement: { companyId: user.companyId } }
        : { id: "" };
  }
}
