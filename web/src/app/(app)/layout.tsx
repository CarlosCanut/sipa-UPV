import { Bell, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/session";
import { roleLabels } from "@/lib/roles";
import { db } from "@/lib/db";
import { readNotificationAction } from "@/app/actions";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
export const dynamic = "force-dynamic";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole();
  const notifications = await db.notification.findMany({
    where: { userId: user.id, readAt: null },
    orderBy: { createdAt: "desc" },
  });
  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-3"
      >
        Saltar al contenido
      </a>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 bg-background">
        <header className="flex h-18 items-center gap-3 border-b bg-card px-5 md:px-9">
          <SidebarTrigger aria-label="Abrir o cerrar menú" />
          <span className="text-xs text-muted-foreground">
            SIPA · Prácticas
          </span>
          <ChevronRight size={13} className="text-muted-foreground" />
          <span className="hidden text-xs sm:block">Mi espacio</span>
          <div className="ml-auto flex items-center gap-4">
            <Badge variant="secondary">{roleLabels[user.role]}</Badge>
            <details className="relative">
              <summary
                className="flex cursor-pointer list-none items-center gap-1 rounded-md p-2 hover:bg-muted"
                aria-label={`Notificaciones: ${notifications.length} sin leer`}
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] text-white">
                    {notifications.length}
                  </span>
                )}
              </summary>
              <div className="absolute right-0 z-30 mt-3 max-h-96 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-xl border bg-card p-3 shadow-sm">
                <h2 className="px-2 py-3 text-sm font-semibold">
                  Notificaciones
                </h2>
                {notifications.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    Estás al día. No tienes novedades.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <form key={n.id} action={readNotificationAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className="w-full rounded-lg p-3 text-left text-sm hover:bg-accent">
                        {n.title}
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {n.createdAt.toLocaleDateString("es-ES", {
                            timeZone: "Europe/Madrid",
                          })}
                        </span>
                      </button>
                    </form>
                  ))
                )}
              </div>
            </details>
          </div>
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-7xl flex-1 px-5 py-9 md:px-9 lg:py-11"
        >
          {children}
          <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t pt-5 text-xs text-muted-foreground">
            <span>Universitat Politècnica de València · Cátedra ENIA</span>
            <span>SIPA · Proyecto piloto</span>
          </footer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
