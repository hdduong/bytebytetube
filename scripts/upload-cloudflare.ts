import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { imageIdFor, uploadImage, uploadVideo } from "../lib/cloudflare";

const ROOT = process.cwd();

function loadEnv(text: string) {
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[name]) process.env[name] = value;
  }
}

function report(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+\S+/g, "Bearer ***").replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@");
}

async function main() {
  loadEnv(await readFile(path.join(ROOT, ".env"), "utf8"));
  const connectionString = process.env.DATABASE_URL?.replace(":6543/", ":5432/");
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = postgres(connectionString, { prepare: false });
  await sql`set default_transaction_read_only = off`;
  await sql`alter table videos add column if not exists playback text`;

  const rows = await sql<{ path: string | null }[]>`
    select avatar as path from users
    union
    select avatar from channels
    union
    select banner from channels
    union
    select thumbnail from videos
    union
    select avatar from videos
  `;
  const images = [...new Set(rows.map((row) => row.path).filter((value): value is string => !!value && !value.startsWith("http")))];
  let imageCount = 0;
  for (const localPath of images) {
    const file = path.join(ROOT, "public", localPath.replace(/^\//, ""));
    const bytes = await readFile(file);
    const url = await uploadImage(bytes, path.basename(file), imageIdFor(localPath));
    await sql`update users set avatar = ${url} where avatar = ${localPath}`;
    await sql`update channels set avatar = ${url} where avatar = ${localPath}`;
    await sql`update channels set banner = ${url} where banner = ${localPath}`;
    await sql`update videos set thumbnail = ${url} where thumbnail = ${localPath}`;
    await sql`update videos set avatar = ${url} where avatar = ${localPath}`;
    imageCount += 1;
    console.log(`image ${imageCount}/${images.length}`);
  }

  const videos = await sql<{ slug: string }[]>`select slug from videos where playback is null order by slug`;
  let videoCount = 0;
  const failed: string[] = [];
  for (const video of videos) {
    try {
      const bytes = await readFile(path.join(ROOT, "public", "videos", `${video.slug}.mp4`));
      const playback = await uploadVideo(bytes, `${video.slug}.mp4`, video.slug);
      await sql`update videos set playback = ${playback} where slug = ${video.slug}`;
      videoCount += 1;
      console.log(`video ${videoCount}/${videos.length} ${video.slug}`);
    } catch (error) {
      failed.push(video.slug);
      console.error(`video failed ${video.slug}: ${report(error)}`);
    }
  }

  const [left] = await sql<{ images: number; videos: number }[]>`
    select
      (select count(*)::int from videos where thumbnail not like 'https://%') as images,
      (select count(*)::int from videos where playback is null) as videos
  `;
  console.log(`done images=${imageCount} videos=${videoCount} failed=${failed.length} remainingImages=${left?.images ?? "?"} remainingVideos=${left?.videos ?? "?"}`);
  await sql.end();
  if (failed.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(report(error));
  process.exit(1);
});
