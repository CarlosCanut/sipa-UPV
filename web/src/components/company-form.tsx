"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { companySchema } from "@/lib/editor-schemas";
import { saveCompanyAction } from "@/app/editor-actions";
import { Input } from "@/components/ui/input";
import { FormFooter, useSave } from "@/components/editor-support";

export function CompanyForm({
  initial = { name: "", taxId: "" },
  id,
}: {
  initial?: z.infer<typeof companySchema>;
  id?: string;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty, errors },
  } = useForm({ resolver: zodResolver(companySchema), defaultValues: initial });
  const status = useSave();
  return (
    <form
      className="panel grid gap-5 md:grid-cols-2"
      onSubmit={handleSubmit(async (values) => {
        if (
          await status.save(
            () => saveCompanyAction(values, id),
            id ? undefined : (key) => `/datos/empresas/${key}`,
          )
        )
          reset(values);
      })}
    >
      <h2 className="font-semibold md:col-span-2">Datos de la empresa</h2>
      <label className="field">
        Nombre
        <Input {...register("name")} minLength={2} maxLength={120} required />
      </label>
      <label className="field">
        CIF (opcional)
        <Input {...register("taxId")} maxLength={40} />
      </label>
      <FormFooter
        pending={isSubmitting}
        dirty={isDirty}
        errors={errors}
        {...status}
      />
    </form>
  );
}
