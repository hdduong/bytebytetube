import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { membershipPlans, readMembership } from "@/lib/membership";
import { subscribeToPlan } from "@/lib/membership-actions";

export const metadata = {
  title: "Premium - CinemaTube",
  description: "Subscribe to CinemaTube Basic or Pro",
};

const loginHref = `/login?next=${encodeURIComponent("/premium")}`;

export default async function PremiumPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const current = session ? await readMembership(session.user.id) : null;
  const currentName = membershipPlans.find((plan) => plan.id === current)?.name;

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 text-ink palm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-1.5" aria-label="CinemaTube home">
          <span className="grid h-[22px] w-8 place-items-center rounded-[5px] bg-[#ff0000]">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5 fill-white" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-[20px] font-bold leading-none tracking-[-0.04em]">CinemaTube</span>
        </Link>

        <p className="mt-8 text-[12px] uppercase tracking-wide text-muted">Membership</p>
        <h1 className="mt-1 text-[28px] font-medium">Premium</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Pick a plan to upload videos and earn from views. The view rate is what you earn.
        </p>
        {currentName ? (
          <p className="mt-4 text-[14px]">
            Your plan is <span className="font-medium">{currentName}</span>.
          </p>
        ) : (
          <p className="mt-4 text-[14px] text-muted">
            {session ? "You do not have a plan yet." : "Sign in to save a plan on your account."}
          </p>
        )}

        <div className="mt-8 grid gap-4 palm:grid-cols-2">
          {membershipPlans.map((plan) => {
            const selected = plan.id === current;
            return (
              <article
                key={plan.id}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex flex-col rounded-xl border p-5",
                  selected ? "border-ink bg-raised" : "border-line",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[20px] font-medium">{plan.name}</h2>
                  {selected ? (
                    <span className="rounded-full bg-chip px-2.5 py-1 text-[12px] font-medium text-on-chip">
                      Current plan
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-[32px] font-medium leading-none">
                  {plan.price}
                  <span className="ml-2 text-[14px] font-normal text-muted">{plan.cadence}</span>
                </p>
                <ul className="mt-5 space-y-2 text-[14px]">
                  <li>{plan.uploads}</li>
                  <li>{plan.earnings}</li>
                </ul>
                <div className="mt-6">
                  {selected ? (
                    <button
                      type="button"
                      disabled
                      className="h-10 rounded-full bg-chip px-4 text-[14px] font-medium text-on-chip disabled:opacity-70"
                    >
                      Current plan
                    </button>
                  ) : session ? (
                    <form action={subscribeToPlan}>
                      <input type="hidden" name="plan" value={plan.id} />
                      <button type="submit" className="h-10 rounded-full bg-chip px-4 text-[14px] font-medium text-on-chip">
                        Subscribe
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={loginHref}
                      className="inline-flex h-10 items-center rounded-full bg-chip px-4 text-[14px] font-medium text-on-chip"
                    >
                      Subscribe
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
