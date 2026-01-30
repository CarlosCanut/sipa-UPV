import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeading } from "@/components/page-heading";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";

export default async function PlacementsPage() {
  const { user } = await requireRole("COMPANY");
  const actor = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { company: true },
  });
  const rows = actor.companyId
    ? await db.placement.findMany({
        where: { companyId: actor.companyId },
        include: { competencyForm: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  return (
    <>
      <PageHeading
        title="Mis plazas"
        description={
          actor.company
            ? `Ofertas de ${actor.company.name}. Los cambios se aplican a futuras simulaciones.`
            : "Pide a coordinación que vincule tu cuenta con una empresa."
        }
      >
        {actor.company && (
          <Button asChild>
            <Link href="/plazas/nueva">Nueva oferta</Link>
          </Button>
        )}
      </PageHeading>
      <DataTable
        columns={[
          { key: "title", label: "Oferta" },
          { key: "seats", label: "Plazas" },
          { key: "form", label: "Competencias" },
          { key: "location", label: "Ubicación" },
          { key: "status", label: "Estado" },
        ]}
        rows={rows.map((p) => ({
          id: p.id,
          href: `/plazas/${p.id}`,
          title: p.title,
          seats: p.seats,
          form: p.competencyForm.name,
          location: p.lat == null ? "Pendiente" : p.address || "Disponible",
          status: p.active ? "Activa" : "Inactiva",
        }))}
      />
    </>
  );
}
