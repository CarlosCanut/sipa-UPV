"use client";
import Link from "next/link";
import { useTransition } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  BriefcaseBusiness,
  Database,
  FileCheck2,
  GitBranch,
  GraduationCap,
  HeartHandshake,
  LogOut,
  Settings2,
  UserRound,
  Users,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { roleLabels } from "@/lib/roles";
import { signOutAction } from "@/app/actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
const navigation = {
  ADMIN: [
    { href: "/simulaciones", label: "Simulaciones", icon: GitBranch },
    { href: "/datos", label: "Datos del proyecto", icon: Database },
  ],
  STUDENT: [
    { href: "/mi-asignacion", label: "Mi asignación", icon: GraduationCap },
    { href: "/preferencias", label: "Mis preferencias", icon: HeartHandshake },
  ],
  COMPANY: [
    { href: "/asignados", label: "Alumnado asignado", icon: Users },
    { href: "/plazas", label: "Mis plazas", icon: BriefcaseBusiness },
  ],
  TUTOR: [
    { href: "/mis-estudiantes", label: "Mis estudiantes", icon: GraduationCap },
  ],
};
export function AppSidebar({ user }: { user: { name: string; role: Role } }) {
  const pathname = usePathname();
  const [signingOut, startSignOut] = useTransition();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar>
      <SidebarHeader className="px-5 py-7">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/upv-logo.svg"
            alt="SIPA · símbolo provisional"
            width={52}
            height={52}
          />
          <div>
            <strong className="text-xl tracking-tight text-foreground">
              Prácticas
            </strong>
            <p className="mt-1 text-[10px] leading-4 tracking-wide text-muted-foreground">
              CÁTEDRA ENIA
              <br />
              UNIVERSITAT POLITÈCNICA
              <br />
              DE VALÈNCIA
            </p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mb-3 tracking-widest uppercase">
            {roleLabels[user.role]}
          </SidebarGroupLabel>
          <SidebarMenu>
            {[
              ...navigation[user.role],
              { href: "/opciones/perfil", label: "Mi perfil", icon: UserRound },
              {
                href: "/evaluacion",
                label: "Evaluación del piloto",
                icon: ClipboardCheck,
              },
            ].map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  className="h-11"
                >
                  <Link href={item.href} onClick={() => setOpenMobile(false)}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent"
            aria-label="Opciones"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-foreground">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {roleLabels[user.role]}
              </span>
            </span>
            <Settings2 size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64">
            {user.role === "ADMIN" && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/opciones/competencias">
                    <FileCheck2 />
                    Competencias y formularios
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/opciones/usuarios">
                    <Users />
                    Usuarios
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/opciones/perfil">
                <UserRound />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signingOut}
              onSelect={() =>
                startSignOut(async () => {
                  await signOutAction();
                })
              }
            >
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
