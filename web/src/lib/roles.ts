import type { Role } from "@/generated/prisma/client";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Coordinación",
  STUDENT: "Estudiante",
  COMPANY: "Empresa",
  TUTOR: "Tutor/a",
};
export const roleHome: Record<Role, string> = {
  ADMIN: "/simulaciones",
  STUDENT: "/mi-asignacion",
  COMPANY: "/asignados",
  TUTOR: "/mis-estudiantes",
};
