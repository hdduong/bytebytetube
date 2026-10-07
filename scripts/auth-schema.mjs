import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const statements = [
  `alter table users add column if not exists email text`,
  `alter table users add column if not exists email_verified boolean not null default false`,
  `alter table users add column if not exists admin boolean not null default false`,
  `alter table users add column if not exists created_at timestamptz not null default now()`,
  `alter table users add column if not exists updated_at timestamptz not null default now()`,
  `create unique index if not exists users_email_unique on users (email)`,
  `create table if not exists session (
    id uuid primary key,
    expires_at timestamptz not null,
    token text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    ip_address text,
    user_agent text,
    user_id uuid not null references users (id) on delete cascade
  )`,
  `create index if not exists session_user_id_idx on session (user_id)`,
  `create table if not exists account (
    id uuid primary key,
    account_id text not null,
    provider_id text not null,
    user_id uuid not null references users (id) on delete cascade,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamptz,
    refresh_token_expires_at timestamptz,
    scope text,
    password text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists account_user_id_idx on account (user_id)`,
  `create unique index if not exists account_provider_account_idx on account (provider_id, account_id)`,
  `create table if not exists verification (
    id uuid primary key,
    identifier text not null,
    value text not null,
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists verification_identifier_idx on verification (identifier)`,
  `alter table session alter column id set default gen_random_uuid()`,
  `alter table account alter column id set default gen_random_uuid()`,
  `alter table verification alter column id set default gen_random_uuid()`,
  `alter table users enable row level security`,
  `alter table session enable row level security`,
  `alter table account enable row level security`,
  `alter table verification enable row level security`,
  `alter table videos add column if not exists playback text`,
];

function loadEnv(text) {
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[name]) process.env[name] = value;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    try {
      loadEnv(await readFile(path.join(process.cwd(), ".env"), "utf8"));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code !== "ENOENT") throw error;
    }
  }
  const connectionString = process.env.DATABASE_URL?.replace(":6543/", ":5432/");
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = postgres(connectionString, { prepare: false });
  await sql`set default_transaction_read_only = off`;
  for (const statement of statements) await sql.unsafe(statement);
  console.log("Auth tables are ready.");
  await sql.end();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@"));
  process.exit(1);
});
