import { Prisma } from "@/generated/prisma/client";

export class InputError extends Error {}
export function mutationError(error: unknown) {
  if (error instanceof InputError) return { error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return { error: "Ya existe un registro con ese nombre o identificador." };
    if (error.code === "P2003")
      return {
        error:
          "Este registro está en uso. Conserva su historial y edítalo en lugar de eliminarlo.",
      };
  }
  return {
    error: "No se pudo guardar. Revisa los datos e inténtalo de nuevo.",
  };
}
