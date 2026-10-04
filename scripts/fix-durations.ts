import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { readFile } from "node:fs/promises";
import ffmpegPath from "ffmpeg-static";
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

function probe(file: string) {
  return new Promise<number>((resolve, reject) => {
    execFile(ffmpegPath!, ["-i", file], (error, stdout, stderr) => {
      const match = `${stdout}\n${stderr}`.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) {
        reject(error ?? new Error(`no duration in ${file}`));
        return;
      }
      resolve(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
    });
  });
}

function label(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remain = rounded % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

async function main() {
  loadEnv(await readFile(path.join(process.cwd(), ".env"), "utf8"));
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || !ffmpegPath) throw new Error("DATABASE_URL or ffmpeg is missing");
  const writeUrl = connectionString.replace(":6543/", ":5432/");
  const sql = postgres(writeUrl, { prepare: false });
  await sql`set default_transaction_read_only = off`;
  const rows = await sql<{ slug: string; live: boolean; duration: string }[]>`
    select slug, live, duration from videos order by slug
  `;
  let updated = 0;
  const samples: string[] = [];
  for (const row of rows) {
    if (row.live) {
      if (row.duration !== "LIVE") {
        await sql`update videos set duration = 'LIVE' where slug = ${row.slug}`;
        updated += 1;
      }
      continue;
    }
    const file = path.join(process.cwd(), "public", "videos", `${row.slug}.mp4`);
    let next = "0:10";
    try {
      await access(file);
      next = label(await probe(file));
    } catch {
      next = "0:10";
    }
    if (row.duration !== next) {
      await sql`update videos set duration = ${next} where slug = ${row.slug}`;
      updated += 1;
    }
    if (samples.length < 5) samples.push(`${row.slug} ${row.duration} -> ${next}`);
  }
  const summary = await sql<{ label: string; count: number }[]>`
    select duration as label, count(*)::int as count from videos group by duration order by count desc
  `;
  console.log(`updated=${updated}`);
  console.log(samples.join("\n"));
  console.log(summary.map((item) => `${item.label} x${item.count}`).join(", "));
  await sql.end();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@"));
  process.exitCode = 1;
});
