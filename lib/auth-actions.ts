"use server";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { account, users } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { safeNextPath } from "@/lib/admin-session";
import { db } from "@/lib/db";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(path: "/login" | "/signup", message: string, next: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`);
}

export async function signIn(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(text(formData, "next"));
  if (!email || !password) fail("/login", "Email and password are required.", next);
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    fail("/login", error instanceof APIError ? error.message : "Could not sign in.", next);
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.admin || !next.startsWith("/admin")) redirect(next);
  redirect(`/login?next=${encodeURIComponent(next)}`);
}

async function removeIncompleteSignup(email: string, existingId: string | undefined) {
  await db.delete(users).where(
    and(
      eq(users.email, email),
      existingId ? sql`${users.id} <> ${existingId}` : sql`true`,
      sql`not exists (select 1 from ${account} where ${account.userId} = ${users.id})`,
    ),
  );
}

export async function signUp(formData: FormData) {
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(text(formData, "next"));
  if (!name || !email || password.length < 8) {
    fail("/signup", "Name, email, and a password of at least 8 characters are required.", next);
  }
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  try {
    await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
  } catch (error) {
    await removeIncompleteSignup(email, existing?.id);
    fail("/signup", error instanceof APIError ? error.message : "Could not create that account.", next);
  }
  redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function claimAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  let claimed = false;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('cinematube-admin-claim'))`);
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.admin, true)).limit(1);
    if (existing) return;
    await tx.update(users).set({ admin: true, updatedAt: new Date() }).where(eq(users.id, session.user.id));
    claimed = true;
  });
  if (!claimed) fail("/login", "An admin already exists.", "/admin");
  redirect("/admin");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
