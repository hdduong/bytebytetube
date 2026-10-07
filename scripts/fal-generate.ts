import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { uploadVideo } from "../lib/cloudflare";
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

async function loadProgress(): Promise<Progress> {
  try {
    return JSON.parse(await readFile(PROGRESS_PATH, "utf8")) as Progress;
  } catch {
    return { done: [], jobs: [], failed: {} };
  }
}

async function saveProgress(progress: Progress) {
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

async function dataUri(thumbnail: string) {
  const file = path.join(ROOT, "public", thumbnail.replace(/^\//, ""));
  const bytes = await readFile(file);
  const type = thumbnail.endsWith(".png") ? "image/png" : "image/jpeg";
  return `data:${type};base64,${bytes.toString("base64")}`;
}

async function submit(key: string, video: VideoRow): Promise<Job> {
  const body = await fal(key, `https://queue.fal.run/${FAL_CHEAPEST_IMAGE_TO_VIDEO}`, {
    method: "POST",
    body: JSON.stringify(falImageToVideoBody(await dataUri(video.thumbnail), promptFor(video))),
  });
  return {
    slug: video.slug,
    requestId: body.request_id,
    statusUrl: body.status_url,
    responseUrl: body.response_url,
  };
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
  await sql`set default_transaction_read_only = off`;
  await sql`alter table videos add column if not exists playback text`;
  const videos = await sql<VideoRow[]>`
    select slug, title, genre, topic, source, thumbnail
    from videos
    order by source, sort_order
  `;
  await mkdir(OUTPUT_DIR, { recursive: true });

  const progress = await loadProgress();
  const done = new Set(progress.done);
  const pending = videos.filter((video) => !done.has(video.slug) && !progress.jobs.some((job) => job.slug === video.slug));
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
        await saveProgress(progress);
        console.error(`failed to queue ${video.slug}: ${message}`);
        if (message.includes("fal 401") || message.includes("fal 403") || message.includes("fal 402")) {
          throw error;
        }
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
        const playback = await uploadVideo(bytes, `${job.slug}.mp4`, job.slug);
        await sql`update videos set playback = ${playback} where slug = ${job.slug}`;
        progress.done.push(job.slug);
        done.add(job.slug);
        await saveProgress(progress);
        console.log(`saved ${progress.done.length}/${videos.length} ${job.slug}`);
      } catch (error) {
        const message = redact(error);
        if (message.includes("fal 401") || message.includes("fal 403")) throw error;
        progress.failed[job.slug] = message;
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
  await sql.end();
}

main().catch((error: unknown) => {
  console.error(redact(error));
  process.exitCode = 1;
});
