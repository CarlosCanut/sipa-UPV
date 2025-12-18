import { requireRole } from "@/lib/session";
import { StubPage } from "@/components/stub-page";
export default async function CompetenciesPage() {
  await requireRole("ADMIN");
  return (
    <StubPage
      title="Competencias y formularios"
      description="Define las competencias y los formularios de evaluación de las prácticas."
    />
  );
}
