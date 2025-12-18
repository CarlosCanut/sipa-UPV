import { requireRole } from "@/lib/session";
import { StubPage } from "@/components/stub-page";
export default async function PreferencesPage() {
  await requireRole("STUDENT");
  return (
    <StubPage
      title="Mis preferencias"
      description="Comparte tus intereses y las competencias que quieres desarrollar."
    />
  );
}
