import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { uploadVideo } from "../lib/cloudflare";
import { readSavedPlayback, writeSavedPlayback } from "./saved-playback";
import { FAL_CHEAPEST_IMAGE_TO_VIDEO, falImageToVideoBody } from "./fal-model";
const ROOT = process.cwd();
const PROGRESS_PATH = path.join(ROOT, "scripts", ".fal-progress.json");
const OUTPUT_DIR = path.join(ROOT, "public", "videos");
const IN_FLIGHT = 6;

type VideoRow = {
  slug: string;
  title: string;
  genre: string | null;
  topic: string | null;
  source: string;
  thumbnail: string;
};

type Job = {
  slug: string;
  requestId: string;
  statusUrl: string;
  responseUrl: string;
};

type Progress = {
  done: string[];
  jobs: Job[];
  failed: Record<string, string>;
};

function redact(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/fal_sk_[^\s"']+/g, "fal_sk_***").replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@");
}

function loadEnv(text: string) {
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[name]) process.env[name] = value;
  }
}

function promptFor(video: VideoRow) {
  const genre = video.genre || video.topic || "movie";
  const format = video.source === "short" ? "9:16 vertical for Shorts" : "16:9 widescreen for regular videos";
  return [
    "Create a cinematic 5-second video clip for a movie review channel.",
    `Title: "${video.title}"`,
    `Genre: ${genre}`,
    "Use the attached thumbnail as the visual reference: match its color palette, lighting, mood, and main subject.",
    "Show an original movie-style scene that captures the title's idea, with smooth camera movement (slow push-in, tracking shot, or pan) and realistic film lighting.",
    `Format: ${format}.`,
    "Style: high-quality cinematic look, shallow depth of field, subtle film grain.",
    "No text, logos, watermarks, or real actors or characters from existing films.",
  ].join("\n");
}

async function fal(key: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`fal ${response.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : {};
}

function failureMap(value: unknown) {
  const failed: Record<string, string> = Object.create(null);
  if (!value || typeof value !== "object" || Array.isArray(value)) return failed;
  for (const [slug, message] of Object.entries(value)) {
    if (typeof message === "string") failed[slug] = message;
  }
  return failed;
}

async function loadProgress(): Promise<Progress> {
  try {
    const parsed = JSON.parse(await readFile(PROGRESS_PATH, "utf8")) as Partial<Progress>;
    return {
      done: Array.isArray(parsed.done) ? parsed.done.filter((slug) => typeof slug === "string") : [],
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      failed: failureMap(parsed.failed),
    };
  } catch {
    return { done: [], jobs: [], failed: failureMap(null) };
  }
}

async function saveProgress(progress: Progress) {
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

async function thumbnailInput(thumbnail: string) {
  if (thumbnail.startsWith("https://") || thumbnail.startsWith("http://")) return thumbnail;
  const file = path.join(ROOT, "public", thumbnail.replace(/^\//, ""));
  const bytes = await readFile(file);
  const type = thumbnail.endsWith(".png") ? "image/png" : "image/jpeg";
  return `data:${type};base64,${bytes.toString("base64")}`;
}

async function submit(key: string, video: VideoRow): Promise<Job> {
  const body = await fal(key, `https://queue.fal.run/${FAL_CHEAPEST_IMAGE_TO_VIDEO}`, {
    method: "POST",
    body: JSON.stringify(falImageToVideoBody(await thumbnailInput(video.thumbnail), promptFor(video))),
  });
  return {
    slug: video.slug,
    requestId: body.request_id,
    statusUrl: body.status_url,
    responseUrl: body.response_url,
  };
}

async function fileExists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function publishExistingClip(sql: postgres.Sql, slug: string) {
  const remembered = await readSavedPlayback();
  let playback = remembered[slug];
  if (!playback) {
    const file = path.join(OUTPUT_DIR, `${slug}.mp4`);
    if (!(await fileExists(file))) return false;
    const bytes = await readFile(file);
    playback = await uploadVideo(bytes, `${slug}.mp4`, slug);
    remembered[slug] = playback;
    await writeSavedPlayback(remembered);
  }
  await sql`update videos set playback = ${playback} where slug = ${slug}`;
  delete remembered[slug];
  await writeSavedPlayback(remembered);
  return true;
}

async function download(url: string, slug: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download ${response.status} for ${slug}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(OUTPUT_DIR, `${slug}.mp4`), bytes);
  return bytes;
}

async function main() {
  loadEnv(await readFile(path.join(ROOT, ".env"), "utf8"));
  const key = process.env.FAL_KEY;
  const connectionString = process.env.DATABASE_URL?.replace(":6543/", ":5432/");
  if (!key) throw new Error("FAL_KEY is not set");
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const sql = postgres(connectionString, { prepare: false });
  try {
  await sql`set default_transaction_read_only = off`;
  await sql`alter table videos add column if not exists playback text`;
  const videos = await sql<VideoRow[]>`
    select slug, title, genre, topic, source, thumbnail
    from videos
    order by source, sort_order
  `;
  const hostedRows = await sql<{ slug: string }[]>`select slug from videos where playback is not null`;
  await mkdir(OUTPUT_DIR, { recursive: true });

  const progress = await loadProgress();
  const done = new Set(progress.done);
  for (const slug of [...done]) {
    if (!hostedRows.some((row) => row.slug === slug)) done.delete(slug);
  }
  for (const row of hostedRows) done.add(row.slug);
  for (const slug of Object.keys(progress.failed)) {
    if (!(await fileExists(path.join(OUTPUT_DIR, `${slug}.mp4`)))) delete progress.failed[slug];
  }
  progress.done = [...done];
  progress.jobs = progress.jobs.filter((job) => !done.has(job.slug));
  let incomplete = false;
  for (const video of videos) {
    if (done.has(video.slug)) continue;
    if (!(await fileExists(path.join(OUTPUT_DIR, `${video.slug}.mp4`)))) continue;
    try {
      await publishExistingClip(sql, video.slug);
      progress.done.push(video.slug);
      done.add(video.slug);
      delete progress.failed[video.slug];
      console.log(`hosted existing ${video.slug}`);
    } catch (error) {
      progress.failed[video.slug] = redact(error);
      incomplete = true;
      console.error(`failed to host ${video.slug}: ${redact(error)}`);
    }
  }
  progress.jobs = progress.jobs.filter((job) => !done.has(job.slug));
  progress.done = [...done];
  await saveProgress(progress);
  const pending = videos.filter(
    (video) => !done.has(video.slug) && !Object.hasOwn(progress.failed, video.slug) && !progress.jobs.some((job) => job.slug === video.slug),
  );
  console.log(`catalog=${videos.length} done=${done.size} queued=${progress.jobs.length} waiting=${pending.length}`);

  while (done.size < videos.length) {
    while (progress.jobs.length < IN_FLIGHT && pending.length > 0) {
      const video = pending.shift()!;
      try {
        const job = await submit(key, video);
        progress.jobs.push(job);
        await saveProgress(progress);
        console.log(`queued ${job.slug} (${progress.jobs.length} in flight)`);
      } catch (error) {
        const message = redact(error);
        progress.failed[video.slug] = message;
        incomplete = true;
        await saveProgress(progress);
        console.error(`failed to queue ${video.slug}: ${message}`);
        if (message.includes("fal 401") || message.includes("fal 403") || message.includes("fal 402")) {
          throw error;
        }
        if (!(await fileExists(path.join(OUTPUT_DIR, `${video.slug}.mp4`)))) delete progress.failed[video.slug];
      }
    }

    if (progress.jobs.length === 0) break;

    const stillRunning: Job[] = [];
    for (const job of progress.jobs) {
      try {
        const status = await fal(key, job.statusUrl);
        if (status.status === "FAILED" || status.status === "ERROR") {
          throw new Error(status.error || status.detail || `fal status ${status.status}`);
        }
        if (status.status !== "COMPLETED") {
          stillRunning.push(job);
          continue;
        }
        const result = await fal(key, job.responseUrl);
        const url = result.video?.url as string | undefined;
        if (!url) throw new Error(`no video url for ${job.slug}`);
        const bytes = await download(url, job.slug);
        try {
          const remembered = await readSavedPlayback();
          let playback = remembered[job.slug];
          if (!playback) {
            playback = await uploadVideo(bytes, `${job.slug}.mp4`, job.slug);
            remembered[job.slug] = playback;
            await writeSavedPlayback(remembered);
          }
          await sql`update videos set playback = ${playback} where slug = ${job.slug}`;
          delete remembered[job.slug];
          await writeSavedPlayback(remembered);
        } catch (error) {
          progress.failed[job.slug] = redact(error);
          incomplete = true;
          console.error(`failed to host ${job.slug}: ${redact(error)}`);
          continue;
        }
        progress.done.push(job.slug);
        done.add(job.slug);
        await saveProgress(progress);
        console.log(`saved ${progress.done.length}/${videos.length} ${job.slug}`);
      } catch (error) {
        const message = redact(error);
        if (message.includes("fal 401") || message.includes("fal 403")) throw error;
        incomplete = true;
        if (await fileExists(path.join(OUTPUT_DIR, `${job.slug}.mp4`))) progress.failed[job.slug] = message;
        console.error(`failed ${job.slug}: ${message}`);
      }
    }
    progress.jobs = stillRunning;
    await saveProgress(progress);
    if (done.size < videos.length && (progress.jobs.length > 0 || pending.length > 0)) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
  }

  console.log(`finished ${done.size}/${videos.length} failed=${Object.keys(progress.failed).length}`);
  if (incomplete || done.size < videos.length) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(redact(error));
  process.exitCode = 1;
});
