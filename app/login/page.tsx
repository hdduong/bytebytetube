import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { users } from "@/drizzle/schema";
import { claimAdmin, signIn, signOut } from "@/lib/auth-actions";
import { auth } from "@/lib/auth";
import { safeAdminPath } from "@/lib/admin-session";
import { db } from "@/lib/db";

const control = "h-10 w-full rounded-lg border border-line bg-transparent px-3 text-[14px] outline-none focus:border-ink";
const submit = "h-10 rounded-full bg-chip px-4 text-[14px] font-medium text-on-chip";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeAdminPath(params.next);
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.admin) redirect(next);
  const [admin] = session
    ? await db.select({ id: users.id }).from(users).where(eq(users.admin, true)).limit(1)
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <p className="text-[12px] uppercase tracking-wide text-muted">CinemaTube</p>
      <h1 className="mt-1 text-[28px] font-medium">Sign in</h1>
      <p className="mt-2 text-[14px] text-muted">Admin pages need a signed-in account with the admin flag.</p>
      {params.error === "forbidden" ? (
        <p className="mt-4 text-[14px] text-[#ff4e45]">This account is signed in, but it is not an admin.</p>
      ) : params.error ? (
        <p className="mt-4 text-[14px] text-[#ff4e45]">{params.error}</p>
      ) : null}
      {session ? (
        <section className="mt-6 grid gap-4 rounded-xl border border-line p-4">
          <p className="text-[14px]">
            Signed in as {session.user.name} ({session.user.email})
          </p>
          {admin ? (
            <p className="text-[14px] text-muted">Ask an admin to turn on your admin flag.</p>
          ) : (
            <form action={claimAdmin}>
              <p className="mb-3 text-[14px] text-muted">Nobody has the admin flag yet.</p>
              <button type="submit" className={submit}>
                Claim admin access
              </button>
            </form>
          )}
          <form action={signOut}>
            <button type="submit" className="text-[14px] text-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </section>
      ) : (
        <div className="mt-6 grid gap-8">
          <form action={signIn} className="grid gap-3">
            <input type="hidden" name="next" value={next} />
            <label className="grid gap-1 text-[13px] text-muted">
              Email
              <input name="email" type="email" required autoComplete="email" placeholder="Email" className={control} />
            </label>
            <label className="grid gap-1 text-[13px] text-muted">
              Password
              <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className={control} />
            </label>
            <button type="submit" className={submit}>
              Sign in
            </button>
          </form>
          <p className="text-[14px] text-muted">
            If you don&apos;t have an account,{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-ink underline">
              Sign up here
            </Link>
            .
          </p>
        </div>
      )}
    </main>
  );
}
