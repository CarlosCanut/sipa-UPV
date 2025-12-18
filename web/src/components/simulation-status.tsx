import { LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
export function SimulationStatus({
  status,
  published = false,
}: {
  status: string;
  published?: boolean;
}) {
  return (
    <Badge
      variant={status === "FAILED" ? "destructive" : "secondary"}
      className="gap-1.5"
    >
      {status === "RUNNING" && <LoaderCircle className="size-3 animate-spin" />}
      {published
        ? "Publicada"
        : status === "RUNNING"
          ? "Calculando…"
          : status === "COMPLETED"
            ? "Completada"
            : "Error"}
    </Badge>
  );
}
