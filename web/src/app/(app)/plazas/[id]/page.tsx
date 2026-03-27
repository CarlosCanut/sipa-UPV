import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeading } from "@/components/page-heading";
import { PlacementForm } from "@/components/placement-form";
import { Button } from "@/components/ui/button";

export default async function PlacementEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copiar?: string }>;
}) {
  const { user } = await requireRole("ADMIN", "COMPANY");
  const { id } = await params;
  const { copiar } = await searchParams;
  const copyId = id === "nueva" ? copiar : undefined;
  const actor = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const scope =
    user.role === "ADMIN" ? {} : { companyId: actor.companyId ?? "" };
  const [placement, forms, companies, dependencies] = await Promise.all([
    id === "nueva" && !copyId
      ? null
      : db.placement.findFirst({
          where: { id: copyId ?? id, ...scope },
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
    db.placement.findMany({
      where: scope,
      select: { id: true, title: true, companyId: true },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!placement && (id !== "nueva" || copyId)) notFound();
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
        title={
          copyId
            ? "Copiar oferta"
            : placement
              ? "Editar oferta"
              : "Nueva oferta"
        }
        description={
          copyId
            ? "Revisa los datos y activa la nueva oferta cuando esté lista. La original conserva sus asignaciones."
            : "Define el centro de trabajo, la capacidad y las competencias que buscas."
        }
      >
        {placement && !copyId && (
          <Button variant="outline" asChild>
            <Link
              href={`/plazas/nueva?copiar=${encodeURIComponent(placement.id)}`}
            >
              Copiar oferta
            </Link>
          </Button>
        )}
      </PageHeading>
      {!form || !companies.length ? (
        <p className="panel">
          Coordinación debe crear al menos una empresa y un formulario de
          competencias antes de añadir ofertas.
        </p>
      ) : (
        <div className="max-w-3xl">
          <PlacementForm
            key={copyId ?? id}
            id={copyId ? undefined : placement?.id}
            companies={
              placement
                ? companies.filter((c) => c.id === placement.companyId)
                : companies
            }
            forms={forms}
            dependencies={dependencies}
            initial={{
              title: copyId
                ? `${placement!.title.slice(0, 110)} · copia`
                : (placement?.title ?? ""),
              program: placement?.program ?? "",
              description: placement?.description ?? "",
              address: placement?.address ?? "",
              lat: placement?.lat ?? null,
              lng: placement?.lng ?? null,
              seats: placement?.seats ?? 1,
              active: copyId ? false : (placement?.active ?? true),
              dependsOnId: copyId ? null : (placement?.dependsOnId ?? null),
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
