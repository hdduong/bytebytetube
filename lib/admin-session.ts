import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeAdminPath, safeNextPath } from "@/lib/return-path";

export { safeAdminPath, safeNextPath };

export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/admin");
  if (!session.user.admin) redirect("/login?error=forbidden&next=/admin");
  return session;
}
