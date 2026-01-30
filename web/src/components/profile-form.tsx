"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Role } from "@/generated/prisma/client";
import { profileSchema, type ProfileValues } from "@/lib/editor-schemas";
import { saveProfileAction } from "@/app/editor-actions";
import { Input } from "@/components/ui/input";
import {
  FormFooter,
  nullableNumber,
  useSave,
} from "@/components/editor-support";

export function ProfileForm({
  initial,
  role,
  targetUserId,
  admin = false,
}: {
  initial: ProfileValues;
  role: Role;
  targetUserId?: string;
  admin?: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });
  const status = useSave();
  const located = role === "STUDENT" || role === "TUTOR";
  return (
    <form
      className="panel grid gap-5 md:grid-cols-2"
      onSubmit={handleSubmit(async (values) => {
        if (await status.save(() => saveProfileAction(values, targetUserId)))
          reset(values);
      })}
    >
      <h2 className="font-semibold md:col-span-2">
        {located ? "Datos para la asignación" : "Datos personales"}
      </h2>
      <label className="field">
        Nombre
        <Input
          {...register("name")}
          autoComplete="name"
          minLength={2}
          maxLength={120}
          required
        />
      </label>
      {role === "STUDENT" && (
        <>
          <label className="field">
            Titulación
            <Input {...register("program")} maxLength={150} />
          </label>
          <label className="field">
            Distancia máxima (km)
            <Input
              type="number"
              min={1}
              max={1000}
              {...register("maxDistanceKm", { setValueAs: nullableNumber })}
            />
            <span className="hint">
              Vacío: se aplica el límite de coordinación.
            </span>
          </label>
        </>
      )}
      {role === "TUTOR" && (
        <>
          <label className="field">
            Departamento
            <Input {...register("department")} maxLength={150} />
          </label>
          <label className="field">
            Capacidad de tutoría
            <Input
              type="number"
              min={0}
              max={1000}
              required
              {...register("maxStudents", { valueAsNumber: true })}
            />
            <span className="hint">
              Número máximo de estudiantes. Usa 0 si no tienes disponibilidad.
            </span>
          </label>
        </>
      )}
      {located && (
        <>
          <label className="field md:col-span-2">
            Ubicación de referencia
            <Input
              {...register("address")}
              autoComplete="street-address"
              maxLength={250}
            />
            <span className="hint">
              Puede ser tu localidad o centro de referencia. No necesitas
              indicar tu domicilio exacto.
            </span>
          </label>
          <label className="field">
            Latitud
            <Input
              type="number"
              step="any"
              min={-90}
              max={90}
              {...register("lat", { setValueAs: nullableNumber })}
              placeholder="39.4699"
            />
          </label>
          <label className="field">
            Longitud
            <Input
              type="number"
              step="any"
              min={-180}
              max={180}
              {...register("lng", { setValueAs: nullableNumber })}
              placeholder="-0.3763"
            />
          </label>
          <p className="hint md:col-span-2">
            Las coordenadas permiten estimar distancias en línea recta. Copia
            latitud y longitud desde tu mapa. Sin ambas, no podrás participar en
            el cálculo.
          </p>
        </>
      )}
      {admin && role === "STUDENT" && (
        <label className="flex items-start gap-3 text-sm md:col-span-2">
          <input className="mt-1" type="checkbox" {...register("priority")} />
          <span>
            Prioridad de acceso
            <span className="hint block">
              Solo coordinación puede establecerla. No se guardan motivos
              personales.
            </span>
          </span>
        </label>
      )}
      <FormFooter
        pending={isSubmitting}
        dirty={isDirty}
        errors={errors}
        {...status}
      />
    </form>
  );
}
