import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { roleLabels } from "@/lib/roles";
import { PageHeading } from "@/components/page-heading";
import { CreateUserForm } from "@/components/account-forms";
import { DataTable } from "@/components/data-table";
import { ResetUserPassword } from "@/components/reset-user-password";
export default async function UsersPage() {
  const { user } = await requireRole("ADMIN");
  const [companies, users] = await Promise.all([
    db.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({ orderBy: { name: "asc" }, include: { company: true } }),
  ]);
  return (
    <>
      <PageHeading
        title="Usuarios"
        description="Facilita el acceso al proyecto y asigna el rol adecuado a cada persona."
      >
        <ResetUserPassword
          users={users
            .filter((u) => u.id !== user.id)
            .map(({ id, name, email }) => ({ id, name, email }))}
        />
      </PageHeading>
      <CreateUserForm companies={companies} />
      <DataTable
        columns={[
          { key: "name", label: "Nombre" },
          { key: "email", label: "Correo" },
          { key: "role", label: "Rol" },
          { key: "company", label: "Empresa" },
        ]}
        rows={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: roleLabels[u.role],
          company: u.company?.name,
        }))}
      />
    </>
  );
}
