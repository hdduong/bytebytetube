import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

function loadEnv(text: string) {
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[name]) process.env[name] = value;
  }
}

function hash(value: string) {
  let total = 0;
  for (const character of value) total = (total * 33 + character.charCodeAt(0)) >>> 0;
  return total;
}

function durationFor(source: string, slug: string) {
  const mixed = hash(slug);
  if (source === "short") return `0:${String(12 + (mixed % 47)).padStart(2, "0")}`;
  const minutes = 4 + (mixed % 14);
  const seconds = (mixed >>> 8) % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function main() {
  loadEnv(await readFile(path.join(process.cwd(), ".env"), "utf8"));
  const connectionString = process.env.DATABASE_URL?.replace(":6543/", ":5432/");
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = postgres(connectionString, { prepare: false });
  await sql`set default_transaction_read_only = off`;
  const rows = await sql<{ slug: string; source: string; live: boolean }[]>`
    select slug, source, live from videos
  `;
  let updated = 0;
  for (const row of rows) {
    if (row.live) continue;
    const next = durationFor(row.source, row.slug);
    await sql`update videos set duration = ${next} where slug = ${row.slug}`;
    updated += 1;
  }
  const summary = await sql<{ label: string; count: number }[]>`
    select duration as label, count(*)::int as count
    from videos
    where live = false
    group by duration
    order by count desc
    limit 8
  `;
  const bounds = await sql<{ shortest: string; longest: string }[]>`
    select min(duration) as shortest, max(duration) as longest
    from videos
    where live = false and source <> 'short'
  `;
  console.log(`updated=${updated}`);
  console.log(`long-form ${bounds[0]?.shortest} to ${bounds[0]?.longest}`);
  console.log(summary.map((item) => `${item.label} x${item.count}`).join(", "));
  await sql.end();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@"));
  process.exitCode = 1;
});
