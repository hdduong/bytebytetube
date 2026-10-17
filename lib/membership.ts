import { eq } from "drizzle-orm";
import { memberships } from "@/drizzle/schema";
import { db } from "@/lib/db";

export const membershipPlans = [
  {
    id: "basic",
    name: "Basic",
    price: "$5",
    cadence: "per month",
    uploads: "Upload up to 100 videos per month",
    earnings: "Earn $1 per 100,000 views",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$20",
    cadence: "per month",
    uploads: "Unlimited video uploads per month",
    earnings: "Earn $1.50 per 100,000 views",
  },
] as const;

export type MembershipPlan = (typeof membershipPlans)[number]["id"];

export function isMembershipPlan(value: string): value is MembershipPlan {
  return membershipPlans.some((plan) => plan.id === value);
}

export async function readMembership(userId: string): Promise<MembershipPlan | null> {
  const [row] = await db
    .select({ plan: memberships.plan })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);
  if (!row || !isMembershipPlan(row.plan)) return null;
  return row.plan;
}

export async function writeMembership(userId: string, plan: MembershipPlan) {
  await db
    .insert(memberships)
    .values({ userId, plan })
    .onConflictDoUpdate({
      target: memberships.userId,
      set: { plan, updatedAt: new Date() },
    });
}
