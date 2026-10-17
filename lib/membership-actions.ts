"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isMembershipPlan, writeMembership } from "@/lib/membership";

export async function subscribeToPlan(formData: FormData) {
  const raw = formData.get("plan");
  const plan = typeof raw === "string" ? raw : "";
  if (!isMembershipPlan(plan)) redirect("/premium");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/login?next=${encodeURIComponent("/premium")}`);
  await writeMembership(session.user.id, plan);
  redirect("/premium");
}
