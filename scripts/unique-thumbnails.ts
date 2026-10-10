import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { imageIdFor, uploadImage } from "../lib/cloudflare";
import { clipImageEmbedding, vectorLiteral } from "./clip-embedding";

const settings = [
  "a rain-soaked alley at night",
  "a sunlit kitchen table",
  "a snowy train platform",
  "a candlelit theater balcony",
  "a rooftop above a crowded city",
  "a foggy forest road",
  "a desert gas station at dusk",
  "an empty swimming pool",
  "a hospital corridor",
  "a ferry deck in a storm",
  "a greenhouse full of glass",
  "a boxing gym",
  "a library after closing",
  "a motel parking lot",
  "a mountain switchback",
  "a subway car between stations",
  "a lighthouse stair",
  "a classroom at sunset",
  "a diner booth",
  "a museum gallery",
  "a fishing boat at dawn",
  "a carnival midway",
  "a courtroom hallway",
  "a recording studio",
  "a greenhouse on a rooftop",
  "a frozen lake",
  "a night market",
  "a barn during a storm",
  "a hotel elevator",
  "a bridge over black water",
  "a desert observatory",
  "a school gym",
  "a flower shop",
  "a cargo dock",
  "a chapel aisle",
  "a laundromat at midnight",
  "a vineyard row",
  "a fire escape",
  "a newsroom",
  "a beach boardwalk in winter",
];

const palettes = [
  "teal and amber",
  "crimson and black",
  "pale gold and blue",
  "green and silver",
  "violet and warm white",
  "orange dusk and navy",
  "cold gray and yellow",
  "pink neon and deep blue",
];

export function thumbnailPrompt(video: { title: string; genre: string | null; source: string; slug: string }) {
  let mix = 0;
  for (const char of video.slug) mix = (mix * 33 + char.charCodeAt(0)) >>> 0;
  const setting = settings[mix % settings.length];
  const palette = palettes[(mix >>> 8) % palettes.length];
  const frame = video.source === "short" ? "vertical 9:16" : "widescreen 16:9";
  const genre = video.genre || "movie";
  return [
    `Original cinematic ${frame} film still, no text, no logos, no watermarks, no famous characters.`,
    `Genre: ${genre}.`,
    `The picture should illustrate this review title: "${video.title}".`,
    `Place the scene in ${setting}.`,
    `Color palette: ${palette}.`,
    "One clear original subject and a different location from a generic canyon or planet poster.",
  ].join(" ");
}

export function thumbnailSize(source: string) {
  return source === "short" ? "portrait_16_9" : "landscape_16_9";
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

function redact(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/fal_sk_[^\s"']+/g, "fal_sk_***").replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@");
}

async function falStill(key: string, prompt: string, source: string) {
  const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      image_size: thumbnailSize(source),
      num_images: 1,
      enable_safety_checker: true,
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`fal ${response.status}: ${text.slice(0, 240)}`);
  const body = text ? JSON.parse(text) : {};
  const url = body.images?.[0]?.url as string | undefined;
  if (!url) throw new Error("fal image returned no url");
  const image = await fetch(url);
  if (!image.ok) throw new Error(`image download ${image.status}`);
  return new Uint8Array(await image.arrayBuffer());
}

export async function generateUniqueThumbnail(
  key: string,
  video: { slug: string; title: string; genre: string | null; source: string },
) {
  const bytes = await falStill(key, thumbnailPrompt(video), video.source);
  return uploadImage(bytes, `${video.slug}.jpg`, imageIdFor(`thumbnails/${video.slug}.jpg`, bytes));
}

async function main() {
  try {
    loadEnv(await readFile(path.join(process.cwd(), ".env"), "utf8"));
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code !== "ENOENT") throw error;
  }
  const key = process.env.FAL_KEY;
  const connectionString = process.env.DATABASE_URL?.replace(":6543/", ":5432/");
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = postgres(connectionString, { prepare: false, max: 1 });
  try {
    await sql`set default_transaction_read_only = off`;
    type ThumbVideo = { slug: string; title: string; genre: string | null; source: string; thumbnail: string };
    const rows = await sql<ThumbVideo[]>`
      select slug, title, genre, source, thumbnail
      from videos
      order by thumbnail, slug
    `;
    const groups = new Map<string, ThumbVideo[]>();
    for (const row of rows) {
      const group = groups.get(row.thumbnail) ?? [];
      group.push(row);
      groups.set(row.thumbnail, group);
    }
    const extras = [...groups.values()].flatMap((group) => group.slice(1));
    console.log(`videos=${rows.length} sharedGroups=${[...groups.values()].filter((group) => group.length > 1).length} toReplace=${extras.length}`);
    if (extras.length === 0) {
      console.log("done remainingShared=0");
      return;
    }
    if (!key) throw new Error("FAL_KEY is required to replace shared thumbnails");
    let done = 0;
    const workers = Array.from({ length: 4 }, async () => {
      for (;;) {
        const video = extras.shift();
        if (!video) return;
        try {
          const thumbnail = await generateUniqueThumbnail(key, video);
          const embedding = vectorLiteral(await clipImageEmbedding(thumbnail));
          await sql`
            update videos
            set thumbnail = ${thumbnail}, thumbnail_embedding = ${embedding}::extensions.vector
            where slug = ${video.slug}
          `;
          done += 1;
          console.log(`replaced ${done} ${video.slug}`);
        } catch (error) {
          console.error(`failed ${video.slug}: ${redact(error)}`);
        }
      }
    });
    await Promise.all(workers);
    const [left] = await sql<{ extras: number }[]>`
      select (count(*) - count(distinct thumbnail))::int as extras from videos
    `;
    console.log(`done remainingShared=${left?.extras ?? "?"}`);
    if ((left?.extras ?? 1) > 0) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.endsWith("unique-thumbnails.ts")) {
  main().catch((error: unknown) => {
    console.error(redact(error));
    process.exit(1);
  });
}
