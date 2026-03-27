import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/page-heading";
import { PreferencesForm } from "@/components/preferences-form";

export default async function PreferencesPage() {
  const { user } = await requireRole("STUDENT");
  const [student, placements, competencies] = await Promise.all([
    db.student.findUniqueOrThrow({
      where: { userId: user.id },
      include: {
        preferences: { orderBy: { rank: "asc" } },
        competencies: true,
      },
    }),
    db.placement.findMany({
      where: { active: true, seats: { gt: 0 } },
      include: {
        company: true,
        requirements: { include: { competency: true } },
      },
      orderBy: { title: "asc" },
    }),
    db.competency.findMany({ orderBy: { name: "asc" } }),
  ]);
  const active = new Set(placements.map((p) => p.id));
  const unavailable = student.preferences.filter(
    (p) => !active.has(p.placementId),
  ).length;
  return (
    <>
      <PageHeading
        title="Mis preferencias"
        description="Elige dónde te gustaría hacer las prácticas y qué quieres aprender."
      />
      {unavailable > 0 && (
        <p className="panel mb-6 text-sm" role="status">
          {unavailable} de tus opciones ya no están disponibles y se han
          retirado de esta selección. Revisa el orden y guarda tus preferencias.
        </p>
      )}
      <PreferencesForm
        competencies={competencies}
        offers={placements.map((p) => ({
          id: p.id,
          title: p.title,
          program: p.program,
          company: p.company.name,
          address: p.address,
          seats: p.seats,
          description: p.description,
          requirements: p.requirements.map((r) => ({
            competencyId: r.competencyId,
            name: r.competency.name,
            level: r.level,
          })),
        }))}
        initial={{
          placementIds: student.preferences
            .filter((p) => active.has(p.placementId))
            .map((p) => p.placementId),
          competencies: Object.fromEntries(
            competencies.map((c) => {
              const saved = student.competencies.find(
                (s) => s.competencyId === c.id,
              );
              return [
                c.id,
                {
                  level: saved?.level ?? 1,
                  wantsToDevelop: saved?.wantsToDevelop ?? false,
                },
              ];
            }),
          ),
        }}
      />
    </>
  );
}
