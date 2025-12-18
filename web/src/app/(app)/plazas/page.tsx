import { requireRole } from "@/lib/session";
import { StubPage } from "@/components/stub-page";
export default async function PlacementsPage() {
  await requireRole("COMPANY");
  return (
    <StubPage
      title="Mis plazas"
      description="Gestiona las oportunidades de prácticas que ofrece tu empresa."
    />
  );
}
