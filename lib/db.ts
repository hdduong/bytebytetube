import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = globalThis as unknown as { cinemaTubeSql?: ReturnType<typeof postgres> };

const client = globalForDb.cinemaTubeSql ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.cinemaTubeSql = client;
}

export const db = drizzle(client, { schema });

export function closeDatabase() {
  return client.end({ timeout: 5 });
}
