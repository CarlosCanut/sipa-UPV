import type { Prisma } from "@/generated/prisma/client";
import { InputError } from "@/lib/mutation-error";

type Offer = {
  id: string;
  companyId: string;
  active: boolean;
  seats: number;
  dependsOnId?: string | null;
};

// MVP semantics: a used offer needs at least one occupied seat in its prerequisite.
export function validatePlacementGraph(offers: Offer[]) {
  const byId = new Map(offers.map((offer) => [offer.id, offer]));
  for (const offer of offers) {
    const seen = new Set<string>();
    let current: Offer | undefined = offer;
    while (current?.dependsOnId) {
      if (seen.has(current.id))
        throw new InputError(
          "Las dependencias entre ofertas no pueden formar un ciclo.",
        );
      seen.add(current.id);
      const prerequisite = byId.get(current.dependsOnId);
      if (!prerequisite || prerequisite.companyId !== current.companyId)
        throw new InputError(
          "La oferta previa debe existir y pertenecer a la misma empresa.",
        );
      if (
        current.active &&
        current.seats > 0 &&
        (!prerequisite.active || !prerequisite.seats)
      )
        throw new InputError(
          "Hay una oferta activa que depende de otra sin plazas disponibles. Revisa ambas ofertas.",
        );
      current = prerequisite;
    }
  }
}

export async function checkPlacementChanges(
  tx: Prisma.TransactionClient,
  changes: Offer[],
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(740113)`;
  const current = await tx.placement.findMany({
    select: {
      id: true,
      companyId: true,
      active: true,
      seats: true,
      dependsOnId: true,
    },
  });
  const merged = new Map<string, Offer>(
    current.map((offer) => [offer.id, offer]),
  );
  for (const change of changes)
    merged.set(change.id, { ...merged.get(change.id), ...change });
  validatePlacementGraph([...merged.values()]);
}
