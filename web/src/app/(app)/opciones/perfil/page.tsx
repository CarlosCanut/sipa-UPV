import { requireRole } from "@/lib/session";
import { roleLabels } from "@/lib/roles";
import { PageHeading } from "@/components/page-heading";
import { PasswordForm } from "@/components/account-forms";
export default async function ProfilePage() {
  const { user } = await requireRole();
  return (
    <>
      <PageHeading
        title="Mi perfil"
        description={`${user.name} · ${user.email} · ${roleLabels[user.role]}`}
      />
      <PasswordForm />
    </>
  );
}
