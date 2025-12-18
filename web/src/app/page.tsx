import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { roleHome } from "@/lib/roles";
export default async function Home() {
  const { user } = await requireRole();
  redirect(roleHome[user.role]);
}
