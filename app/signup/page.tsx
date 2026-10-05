import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/lib/auth-actions";
import { auth } from "@/lib/auth";
import { safeAdminPath } from "@/lib/admin-session";

const control = "h-10 w-full rounded-lg border border-line bg-transparent px-3 text-[14px] outline-none focus:border-ink";
const submit = "h-10 rounded-full bg-chip px-4 text-[14px] font-medium text-on-chip";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeAdminPath(params.next);
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(`/login?next=${encodeURIComponent(next)}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <p className="text-[12px] uppercase tracking-wide text-muted">CinemaTube</p>
      <h1 className="mt-1 text-[28px] font-medium">Sign up</h1>
      <p className="mt-2 text-[14px] text-muted">Create an account for CinemaTube.</p>
      {params.error ? <p className="mt-4 text-[14px] text-[#ff4e45]">{params.error}</p> : null}
      <form action={signUp} className="mt-6 grid gap-3">
        <input type="hidden" name="next" value={next} />
        <input name="name" required placeholder="Name" className={control} />
        <input name="email" type="email" required placeholder="Email" className={control} />
        <input name="password" type="password" required minLength={8} placeholder="Password" className={control} />
        <button type="submit" className={submit}>
          Sign up
        </button>
      </form>
      <p className="mt-4 text-[14px] text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink underline">
          Sign in
        </Link>
        .
      </p>
    </main>
  );
}
