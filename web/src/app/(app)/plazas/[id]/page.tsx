import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeading } from "@/components/page-heading";
import { PlacementForm } from "@/components/placement-form";

export default async function PlacementEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole("ADMIN", "COMPANY");
  const { id } = await params;
  const actor = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const scope =
    user.role === "ADMIN" ? {} : { companyId: actor.companyId ?? "" };
  const [placement, forms, companies] = await Promise.all([
    id === "nueva"
      ? null
      : db.placement.findFirst({
          where: { id, ...scope },
          include: { requirements: true },
        }),
    db.competencyForm.findMany({
      include: {
        items: { include: { competency: true }, orderBy: { position: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    db.company.findMany({
      where: user.role === "ADMIN" ? {} : { id: actor.companyId ?? "" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!placement && id !== "nueva") notFound();
  const form =
    forms.find((f) => f.id === placement?.competencyFormId) ?? forms[0];
  const back = user.role === "ADMIN" ? "/datos?tab=plazas" : "/plazas";
  return (
    <>
      <Link
        className="mb-6 inline-block text-sm text-primary hover:underline"
        href={back}
      >
        ← Volver a ofertas
      </Link>
      <PageHeading
        title={placement ? "Editar oferta" : "Nueva oferta"}
        description="Define el centro de trabajo, la capacidad y las competencias que buscas."
      />
      {!form || !companies.length ? (
        <p className="panel">
          Coordinación debe crear al menos una empresa y un formulario de
          competencias antes de añadir ofertas.
        </p>
      ) : (
        <div className="max-w-3xl">
          <PlacementForm
            id={placement?.id}
            companies={
              placement
                ? companies.filter((c) => c.id === placement.companyId)
                : companies
            }
            forms={forms}
            initial={{
              title: placement?.title ?? "",
              description: placement?.description ?? "",
              address: placement?.address ?? "",
              lat: placement?.lat ?? null,
              lng: placement?.lng ?? null,
              seats: placement?.seats ?? 1,
              active: placement?.active ?? true,
              companyId: placement?.companyId ?? companies[0].id,
              competencyFormId: form.id,
              requirements: Object.fromEntries(
                form.items.map((i) => [
                  i.competencyId,
                  placement?.requirements.find(
                    (r) => r.competencyId === i.competencyId,
                  )?.level ?? 3,
                ]),
              ),
            }}
          />
        </div>
      )}
    </>
  );
}
