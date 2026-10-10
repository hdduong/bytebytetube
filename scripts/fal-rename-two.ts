import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, or, sql } from "drizzle-orm";
import type { OverlayPart } from "../lib/videos";
import { FAL_CHEAPEST_IMAGE_TO_VIDEO, falImageToVideoBody } from "./fal-model";
const ROOT = process.cwd();

const renames = [
  {
    fromSlugs: ["a-punch-with-a-plot", "the-stunt-that-carries-the-story", "motion-that-tells-the-story"],
    title: "A slow move across the set",
    slug: "a-slow-move-across-the-set",
    overlay: [
      [{ text: "A SLOW MOVE", style: "poster" }],
      [{ text: "ACROSS THE SET", style: "poster", tone: "red" }],
    ],
  },
  {
    fromSlugs: ["the-sky-is-doing-too-much", "color-washes-across-the-sky", "painted-clouds-drift-overhead"],
    title: "Soft light above the trees",
    slug: "soft-light-above-the-trees",
    overlay: [
      [{ text: "SOFT LIGHT ABOVE", style: "poster" }],
      [{ text: "THE TREES", style: "poster", tone: "red" }],
    ],
  },
];

function loadEnv(text: string) {
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[name]) process.env[name] = value;
  }
}

function redact(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/fal_sk_[^\s"']+/g, "fal_sk_***").replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@");
}

function promptFor(title: string, genre: string, source: string) {
  const format = source === "short" ? "9:16 vertical for Shorts" : "16:9 widescreen for regular videos";
  return [
    "Create a cinematic 5-second video clip for a movie review channel.",
    `Title: "${title}"`,
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
    await writeFile(path.join(ROOT, "scripts", ".fal-error.txt"), text);
    throw new Error(`fal ${response.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  loadEnv(await readFile(path.join(ROOT, ".env"), "utf8"));
  const key = process.env.FAL_KEY;
  if (!key || !process.env.DATABASE_URL) throw new Error("FAL_KEY or DATABASE_URL is not set");

  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const { comments, videos } = await import("../drizzle/schema");
  const sessionUrl = process.env.DATABASE_URL!.replace(":6543/", ":5432/");
  const client = postgres(sessionUrl, { prepare: false });
  await client`set default_transaction_read_only = off`;
  const db = drizzle(client, { schema: { comments, videos } });
  const commentHits = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(or(sql`body ilike '%punch with a plot%'`, sql`body ilike '%sky is doing too much%'`));
  console.log(`comments mentioning old titles=${commentHits[0]?.count ?? 0}`);

  let failed = false;
  for (const item of renames) {
    try {
      const { clipImageEmbedding } = await import("./clip-embedding");
      const { generateUniqueThumbnail } = await import("./unique-thumbnails");
      const thumbnail = await generateUniqueThumbnail(key, {
        slug: item.slug,
        title: item.title,
        genre: null,
        source: "feed",
      });
      const embedding = await clipImageEmbedding(thumbnail);
      const image = await fetch(thumbnail);
      if (!image.ok) throw new Error(`thumbnail download ${image.status} for ${item.slug}`);
      const bytes = new Uint8Array(await image.arrayBuffer());
      const rows = await db
        .update(videos)
        .set({
          title: item.title,
          slug: item.slug,
          overlay: item.overlay as OverlayPart[][],
          thumbnail,
          thumbnailEmbedding: embedding,
          duration: "0:05",
        })
        .where(or(...[...item.fromSlugs, item.slug].map((slug) => eq(videos.slug, slug))))
        .returning({ genre: videos.genre, topic: videos.topic, source: videos.source, thumbnail: videos.thumbnail });
      const video = rows[0];
      if (!video) throw new Error(`missing video ${item.fromSlugs[0]}`);
      console.log(`renamed ${item.fromSlugs[0]} -> ${item.slug} thumb=${video.thumbnail} genre=${video.genre}`);
      const type = video.thumbnail.endsWith(".png") ? "image/png" : "image/jpeg";
      const queued = await fal(key, `https://queue.fal.run/${FAL_CHEAPEST_IMAGE_TO_VIDEO}`, {
        method: "POST",
        body: JSON.stringify(
          falImageToVideoBody(
            `data:${type};base64,${Buffer.from(bytes).toString("base64")}`,
            promptFor(item.title, video.genre || video.topic || "movie", video.source),
          ),
        ),
      });
      console.log(`queued ${item.slug}`);

      for (;;) {
        const status = await fal(key, queued.status_url);
        if (status.status === "COMPLETED") break;
        if (status.status === "FAILED" || status.status === "ERROR") {
          throw new Error(`${item.slug} ${status.error || status.status}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
      const result = await fal(key, queued.response_url);
      const url = result.video?.url as string | undefined;
      if (!url) throw new Error(`no video url for ${item.slug}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`download ${response.status} for ${item.slug}`);
      await writeFile(path.join(ROOT, "public", "videos", `${item.slug}.mp4`), Buffer.from(await response.arrayBuffer()));
      console.log(`saved ${item.slug}`);
    } catch (error) {
      failed = true;
      console.error(`${item.slug}: ${redact(error)}`);
    }
  }
  if (failed) process.exitCode = 1;

  await client.end();
  console.log("renames finished");
}

main()
  .catch((error: unknown) => {
    const cause = error instanceof Error && "cause" in error ? error.cause : undefined;
    console.error(redact(error));
    if (cause) console.error(redact(cause));
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  });
