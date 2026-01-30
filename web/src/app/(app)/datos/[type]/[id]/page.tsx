import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { profileValues } from "@/lib/profile-values";
import { ProfileForm } from "@/components/profile-form";
import { CompanyForm } from "@/components/company-form";
import { PageHeading } from "@/components/page-heading";

export default async function DataEditor({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  await requireRole("ADMIN");
  const { type, id } = await params;
  if (!["estudiantes", "tutores", "empresas"].includes(type)) notFound();
  const back = (
    <Link
      className="mb-6 inline-block text-sm text-primary hover:underline"
      href={`/datos?tab=${type}`}
    >
      ← Volver a datos
    </Link>
  );
  if (type === "empresas") {
    const company =
      id === "nueva" ? null : await db.company.findUnique({ where: { id } });
    if (!company && id !== "nueva") notFound();
    return (
      <>
        {back}
        <PageHeading
          title={company?.name ?? "Nueva empresa"}
          description="Después puedes vincular sus contactos desde Usuarios y crear sus ofertas."
        />
        <div className="max-w-3xl">
          <CompanyForm
            id={company?.id}
            initial={
              company
                ? { name: company.name, taxId: company.taxId ?? "" }
                : undefined
            }
          />
        </div>
      </>
    );
  }
  const user = await db.user.findFirst({
    where:
      type === "estudiantes"
        ? { student: { id }, role: "STUDENT" }
        : { tutor: { id }, role: "TUTOR" },
    include: { student: true, tutor: true },
  });
  if (!user) notFound();
  return (
    <>
      {back}
      <PageHeading title={user.name} description={user.email} />
      <div className="max-w-3xl">
        <ProfileForm
          initial={profileValues(user)}
          role={user.role}
          targetUserId={user.id}
          admin
        />
      </div>
    </>
  );
}
