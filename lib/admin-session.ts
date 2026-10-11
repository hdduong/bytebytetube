import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export function safeAdminPath(value: string | undefined) {
  if (value && value.startsWith("/admin") && !value.startsWith("//")) return value;
  return "/admin";
}

export function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) {
    return "/admin";
  }
  return value.slice(0, 200);
}

export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/admin");
  if (!session.user.admin) redirect("/login?error=forbidden");
  return session;
}
