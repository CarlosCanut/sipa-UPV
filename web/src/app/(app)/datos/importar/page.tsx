import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeading } from "@/components/page-heading";
import { ImportForm } from "@/components/import-form";
import { db } from "@/lib/db";
export default async function ImportPage() {
  await requireRole("ADMIN");
  const forms = await db.competencyForm.findMany({
    include: {
      items: { include: { competency: true }, orderBy: { position: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <Link
        href="/datos"
        className="mb-6 inline-block text-sm text-primary hover:underline"
      >
        ← Volver a datos
      </Link>
      <PageHeading
        title="Importar datos"
        description="Revisa cada archivo antes de guardar. Un error impide la importación completa."
      />
      <ImportForm />
      <details className="panel mt-6 max-w-4xl">
        <summary className="cursor-pointer text-sm font-medium">
          Identificadores de formularios y competencias para CSV
        </summary>
        <p className="hint my-4">
          Los identificadores de empresas están en su CSV. Para requirements usa
          los identificadores de competencia de cada formulario con un nivel de
          1 a 5.
        </p>
        {forms.map((form) => (
          <div key={form.id} className="mt-4 border-t pt-4">
            <p className="text-sm font-medium">{form.name}</p>
            <code className="break-all text-xs">{form.id}</code>
            <ul className="mt-3 space-y-2 text-xs">
              {form.items.map((i) => (
                <li key={i.competencyId}>
                  {i.competency.name}:{" "}
                  <code className="break-all">{i.competencyId}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </details>
    </>
  );
}
