import { Clock3 } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
export function StubPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <PageHeading title={title} description={description} />
      <div className="panel max-w-2xl">
        <Clock3 className="mb-4 text-primary" />
        <h2 className="text-lg font-semibold">
          Disponible en una siguiente fase
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Esta versión permite consultar los datos y las asignaciones. La
          edición de esta sección se incorporará más adelante.
        </p>
      </div>
    </>
  );
}
