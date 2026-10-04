import { execFile } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import postgres from "postgres";

const execFileAsync = promisify(execFile);

function redact(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
if (!ffmpegPath) {
  console.error("ffmpeg binary was not found");
  process.exit(1);
}

const root = process.cwd();
const outputDir = path.join(root, "public", "videos");

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function render(slug: string, thumbnail: string, source: string) {
  const output = path.join(outputDir, `${slug}.mp4`);
  if (await exists(output)) return "skipped";
  const input = path.join(root, "public", thumbnail.replace(/^\//, ""));
  const portrait = source === "short";
  const scale = portrait
    ? "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280"
    : "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720";
  await execFileAsync(ffmpegPath!, [
    "-y",
    "-loop",
    "1",
    "-i",
    input,
    "-t",
    portrait ? "6" : "8",
    "-vf",
    scale,
    "-r",
    "24",
    "-c:v",
    "libx264",
    "-tune",
    "stillimage",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    output,
  ]);
  return "wrote";
}

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  async function next(): Promise<void> {
    const current = index;
    index += 1;
    if (current >= items.length) return;
    await worker(items[current]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

async function main() {
  const sql = postgres(connectionString!, { prepare: false });
  const rows = await sql<{ slug: string; thumbnail: string; source: string }[]>`
    select slug, thumbnail, source from videos order by sort_order
  `;
  await sql.end();
  await mkdir(outputDir, { recursive: true });

  let wrote = 0;
  let skipped = 0;
  await pool(rows, 4, async (row) => {
    const result = await render(row.slug, row.thumbnail, row.source);
    if (result === "wrote") wrote += 1;
    else skipped += 1;
    const done = wrote + skipped;
    if (done % 10 === 0 || done === rows.length) {
      console.log(`${done}/${rows.length}`);
    }
  });
  console.log(`Generated ${wrote} videos, skipped ${skipped} existing files`);
}

main().catch((error: unknown) => {
  console.error(redact(error));
  process.exitCode = 1;
});
