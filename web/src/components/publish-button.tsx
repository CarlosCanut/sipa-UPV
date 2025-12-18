"use client";
import { useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import { publishAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function PublishButton({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  if (published)
    return (
      <Button disabled>
        <Check />
        Publicada
      </Button>
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send />
          Publicar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar asignaciones</DialogTitle>
          <DialogDescription>
            Esta propuesta sustituirá a la publicación anterior. Estudiantes,
            empresas y tutores verán sus asignaciones y recibirán una
            notificación.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await publishAction(id);
                if (result.error) setError(result.error);
                else setOpen(false);
              })
            }
          >
            {pending ? "Publicando…" : "Publicar asignaciones"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
