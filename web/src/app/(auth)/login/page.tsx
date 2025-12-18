import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowUpRight, GraduationCap } from "lucide-react";
import { getSession } from "@/lib/session";
import { roleHome } from "@/lib/roles";
import { LoginForm } from "@/components/login-form";
export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(roleHome[session.user.role]);
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="flex flex-col justify-between border-b bg-secondary p-8 lg:border-r lg:p-16">
        <div className="flex items-center gap-3">
          <Image
            src="/upv-logo.svg"
            alt="SIPA · símbolo provisional"
            width={52}
            height={52}
          />
          <div>
            <strong className="text-xl tracking-tight">Prácticas</strong>
            <p className="text-xs text-muted-foreground">
              SIPA · Cátedra ENIA UPV
            </p>
          </div>
        </div>
        <div className="max-w-lg py-16">
          <p className="eyebrow">Personas, oportunidades y aprendizaje</p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight lg:text-5xl">
            El siguiente paso,
            <br />
            en el lugar adecuado.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
            Un espacio compartido para conectar estudiantes, empresas y tutores.
            Asignaciones que tienen en cuenta preferencias, competencias y
            proximidad.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-primary">
            <GraduationCap size={24} />
            Prácticas con acompañamiento
            <ArrowUpRight size={16} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Proyecto piloto · Universitat Politècnica de València
        </p>
      </section>
      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <p className="eyebrow">Bienvenido/a a SIPA</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Accede a tu espacio
          </h2>
          <p className="mt-3 mb-8 text-sm leading-6 text-muted-foreground">
            Consulta y gestiona tus prácticas con la cuenta de tu centro.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
