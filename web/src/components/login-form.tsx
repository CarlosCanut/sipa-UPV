"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { roleHome } from "@/lib/roles";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
const schema = z.object({ email: z.email(), password: z.string().min(1) });
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          const result = await authClient.signIn.email(values);
          if (result.error) {
            setError("Correo o contraseña incorrectos. Inténtalo de nuevo.");
            return;
          }
          router.push(roleHome[result.data.user.role]);
          router.refresh();
        } catch {
          setError("No se pudo conectar. Inténtalo de nuevo.");
        }
      })}
    >
      <label className="field">
        Correo electrónico
        <Input
          {...register("email")}
          type="email"
          autoComplete="username"
          placeholder="tu.nombre@ejemplo.es"
          required
        />
      </label>
      <label className="field">
        Contraseña
        <Input
          {...register("password")}
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <Button className="w-full" disabled={isSubmitting}>
        <LogIn />
        {isSubmitting ? "Accediendo…" : "Entrar a mi espacio"}
      </Button>
      <p className="hint">
        El acceso lo facilita coordinación. Si necesitas una cuenta, contacta
        con tu centro.
      </p>
    </form>
  );
}
