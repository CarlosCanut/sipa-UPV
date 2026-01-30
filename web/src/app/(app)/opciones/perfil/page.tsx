import { requireRole } from "@/lib/session";
import { roleLabels } from "@/lib/roles";
import { PageHeading } from "@/components/page-heading";
import { PasswordForm } from "@/components/account-forms";
import { ProfileForm } from "@/components/profile-form";
import { CompanyForm } from "@/components/company-form";
import { db } from "@/lib/db";
import { profileValues } from "@/lib/profile-values";
export default async function ProfilePage() {
  const { user } = await requireRole();
  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { student: true, tutor: true, company: true },
  });
  return (
    <>
      <PageHeading
        title="Mi perfil"
        description={`${user.name} · ${user.email} · ${roleLabels[user.role]}`}
      />
      <div className="max-w-3xl space-y-8">
        <ProfileForm initial={profileValues(profile)} role={user.role} />
        {profile.company && (
          <CompanyForm
            id={profile.company.id}
            initial={{
              name: profile.company.name,
              taxId: profile.company.taxId ?? "",
            }}
          />
        )}
        <PasswordForm />
      </div>
    </>
  );
}
