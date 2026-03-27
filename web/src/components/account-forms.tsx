"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, UserPlus } from "lucide-react";
import { createUserSchema, passwordSchema } from "@/lib/schemas";
import { createUserAction, changePasswordAction } from "@/app/actions";
import { roleLabels } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function CreateUserForm({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "STUDENT" },
  });
  return (
    <div className="panel mb-8">
      <h2 className="mb-5 font-semibold">Crear una cuenta</h2>
      <form
        className="grid gap-5 md:grid-cols-2"
        onSubmit={handleSubmit(async (values) => {
          setMessage("");
          setPassword("");
          setCopied(false);
          const result = await createUserAction(values);
          if (result.error) setMessage(result.error);
          else {
            setPassword(result.password ?? "");
            reset();
          }
        })}
      >
        <label className="field">
          Nombre
          <Input {...register("name")} required minLength={2} />
        </label>
        <label className="field">
          Correo electrónico
          <Input {...register("email")} type="email" required />
        </label>
        <label className="field">
          Rol
          <select
            {...register("role")}
            className="h-9 rounded-md border bg-background px-3"
          >
            {Object.entries(roleLabels).map(([role, label]) => (
              <option value={role} key={role}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Empresa (solo para contactos)
          <select
            {...register("companyId")}
            className="h-9 rounded-md border bg-background px-3"
          >
            <option value="">Selecciona una empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {Object.keys(errors).length > 0 && (
          <p className="error-text md:col-span-2" role="alert">
            Revisa los campos. Los contactos de empresa necesitan una empresa.
          </p>
        )}
        {message && (
          <p className="error-text md:col-span-2" role="alert">
            {message}
          </p>
        )}
        <div className="md:col-span-2">
          <Button disabled={isSubmitting}>
            <UserPlus />
            {isSubmitting ? "Creando…" : "Crear usuario"}
          </Button>
        </div>
      </form>
      {password && (
        <div
          className="mt-6 space-y-3 rounded-lg border bg-accent p-4"
          role="status"
        >
          <p className="text-sm font-medium">
            Cuenta creada. Guarda la contraseña temporal: solo se muestra ahora.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="break-all rounded bg-card px-3 py-2 text-sm select-all">
              {password}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(password);
                  setCopied(true);
                } catch {
                  setMessage("Selecciona y copia la contraseña manualmente.");
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiada" : "Copiar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPassword("")}>
              Ocultar
            </Button>
          </div>
          <p className="hint">
            La persona puede cambiarla en Opciones › Perfil. Las nuevas fichas
            de estudiante y tutor se crean sin coordenadas; deben completarse
            antes de participar en una simulación.
          </p>
        </div>
      )}
    </div>
  );
}
export function PasswordForm() {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });
  return (
    <form
      className="panel max-w-lg space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setMessage("");
        setSuccess(false);
        const result = await changePasswordAction(values);
        if (result.error) setMessage(result.error);
        else {
          setSuccess(true);
          setMessage(
            "Contraseña actualizada. Las otras sesiones se han cerrado.",
          );
          reset();
        }
      })}
    >
      <h2 className="font-semibold">Cambiar contraseña</h2>
      <label className="field">
        Contraseña actual
        <Input
          {...register("currentPassword")}
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <label className="field">
        Nueva contraseña
        <Input
          {...register("newPassword")}
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
        <span className="hint">Al menos 12 caracteres.</span>
      </label>
      {errors.newPassword && (
        <p className="error-text" role="alert">
          {errors.newPassword.message}
        </p>
      )}
      {message && (
        <p
          className={success ? "text-sm text-primary" : "error-text"}
          role="status"
        >
          {message}
        </p>
      )}
      <Button disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
