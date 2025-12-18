"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel m-8 space-y-4" role="alert">
      <h1 className="text-xl font-semibold">No se pudo cargar esta página</h1>
      <p>
        Inténtalo de nuevo. Si el problema continúa, contacta con coordinación.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
