"use client";
import { useState, useTransition } from "react";
import { resetUserPasswordAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ResetUserPassword({
  users,
}: {
  users: { id: string; name: string; email: string }[];
}) {
  const [id, setId] = useState(users[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog
      onOpenChange={() => {
        setPassword("");
        setError("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!users.length}>
          Restablecer acceso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            Genera una contraseña temporal y cierra todas las sesiones de esa
            persona. Comunícasela por un canal seguro; no se envía correo
            automático.
          </DialogDescription>
        </DialogHeader>
        {password ? (
          <div className="space-y-3">
            <p className="text-sm">
              Contraseña temporal. Se muestra una sola vez:
            </p>
            <code className="block break-all rounded border p-3">
              {password}
            </code>
            <p className="hint">La persona puede cambiarla desde Mi perfil.</p>
          </div>
        ) : (
          <>
            <label className="field">
              Usuario
              <select
                className="select"
                value={id}
                onChange={(event) => setId(event.target.value)}
                disabled={pending}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.email}
                  </option>
                ))}
              </select>
            </label>
            <Button
              disabled={pending || !id}
              onClick={() =>
                start(async () => {
                  const result = await resetUserPasswordAction(id);
                  setError(result.error ?? "");
                  setPassword(result.password ?? "");
                })
              }
            >
              {pending ? "Restableciendo…" : "Confirmar restablecimiento"}
            </Button>
          </>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
