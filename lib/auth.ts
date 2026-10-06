import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { account, session, users, verification } from "@/drizzle/schema";
import { db } from "@/lib/db";

function handleFor(email: string) {
  const local = email.split("@")[0]?.replace(/[^A-Za-z0-9_]/g, "") || "member";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  return `@${`${local}${suffix}`.slice(0, 30)}`;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    transaction: true,
    schema: {
      user: users,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    fields: {
      image: "avatar",
    },
    additionalFields: {
      handle: {
        type: "string",
        required: false,
        input: false,
      },
      admin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email.toLowerCase();
          return {
            data: {
              ...user,
              email,
              handle: handleFor(email),
              image: user.image || "",
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
