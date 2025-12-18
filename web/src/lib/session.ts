import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { getAuth } from "@/lib/auth";
import { roleHome } from "@/lib/roles";

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
});
export async function requireRole(...roles: Role[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (roles.length && !roles.includes(session.user.role))
    redirect(roleHome[session.user.role]);
  return session;
}
