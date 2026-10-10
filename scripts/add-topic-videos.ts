import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { imageIdFor, uploadImage, uploadVideo } from "../lib/cloudflare";
import { falImageToVideoBody, FAL_CHEAPEST_IMAGE_TO_VIDEO } from "./fal-model";
import { clipImageEmbedding, vectorLiteral } from "./clip-embedding";

const topics = [
  {
    slug: "the-opening-theme-is-the-thesis",
    title: "The opening theme is the thesis",
    channel: "Ink and Cell",
    genre: "Animation",
    duration: "14:12",
    views: "86K views",
    viewCount: 86_000,
    uploaded: "1 day ago",
    align: "left",
    imagePrompt:
      "Original anime-style cinematic still, 16:9. A rainy neon city at night, one teenager with a school bag under a glowing sign, cel shading, rich color, no text, no logos, no famous characters.",
    motion: "Slow push-in on an original anime-style rainy city and a student under neon light.",
  },
  {
    slug: "a-filler-episode-hides-the-twist",
    title: "A filler episode hides the twist",
    channel: "Ink and Cell",
    genre: "Animation",
    duration: "11:40",
    views: "54K views",
    viewCount: 54_000,
    uploaded: "3 days ago",
    align: "center",
    imagePrompt:
      "Original anime-style cinematic still, 16:9. Two characters seen from behind on a quiet dusk train platform, warm sky, cel shading, no text, no logos, no famous characters.",
    motion: "A gentle pan across an original anime train platform at dusk.",
  },
  {
    slug: "the-build-order-is-the-plot",
    title: "The build order is the plot",
    channel: "Orbit Club",
    genre: "Sci-Fi",
    duration: "16:05",
    views: "121K views",
    viewCount: 121_000,
    uploaded: "2 days ago",
    align: "right",
    imagePrompt:
      "Cinematic 16:9 science-fiction battlefield. Original soldiers in bulky powered armor cross a dusty canyon toward a metal base, one hovering artillery vehicle, late-day light, no text, no logos, no copied game characters.",
    motion: "A slow tracking shot of original powered-armor soldiers crossing a dusty sci-fi canyon.",
  },
  {
    slug: "the-swarm-arrives-before-the-review",
    title: "The swarm arrives before the review",
    channel: "Orbit Club",
    genre: "Sci-Fi",
    duration: "13:28",
    views: "97K views",
    viewCount: 97_000,
    uploaded: "5 days ago",
    align: "left",
    imagePrompt:
      "Cinematic 16:9 science-fiction scene. A huge original alien insect swarm pours over a red ridge toward a small futuristic outpost, dramatic dust and sunlight, no text, no logos, no copied game creatures.",
    motion: "A wide pan as an original alien swarm crests a red ridge toward a futuristic outpost.",
  },
  {
    slug: "the-cape-is-doing-too-much",
    title: "The cape is doing too much",
    channel: "Frame Rate",
    genre: "Action",
    duration: "12:33",
    views: "143K views",
    viewCount: 143_000,
    uploaded: "4 days ago",
    align: "center",
    imagePrompt:
      "Cinematic 16:9 comic-book movie still. An original superhero in a simple dark suit and long cape lands on a rainy rooftop above a lit city, heroic lighting, no text, no logos, no famous superhero costume.",
    motion: "A slow push-in on an original caped hero landing on a rainy rooftop.",
  },
] as const;

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

function overlay(title: string) {
  const words = title.split(" ");
  const mid = Math.max(1, Math.ceil(words.length / 2));
  const second = words.slice(mid).join(" ") || "REVIEW";
  return [
    [{ text: words.slice(0, mid).join(" ").toUpperCase(), style: "poster" }],
    [{ text: second.toUpperCase(), style: "poster", tone: "red" }],
  ];
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
  if (!response.ok) throw new Error(`fal ${response.status}: ${text.slice(0, 240)}`);
  return text ? JSON.parse(text) : {};
}

async function generateStill(key: string, prompt: string) {
  const body = await fal(key, "https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      image_size: "landscape_16_9",
      num_images: 1,
      enable_safety_checker: true,
    }),
  });
  const url = body.images?.[0]?.url as string | undefined;
  if (!url) throw new Error("fal image returned no url");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`image download ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function main() {
  loadEnv(await readFile(path.join(process.cwd(), ".env"), "utf8"));
  const key = process.env.FAL_KEY;
  const connectionString = process.env.DATABASE_URL?.replace(":6543/", ":5432/");
  if (!key) throw new Error("FAL_KEY is not set");
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = postgres(connectionString, { prepare: false, max: 1 });
  try {
    await sql`set default_transaction_read_only = off`;
    const channels = await sql<{ id: string; name: string; avatar: string }[]>`
      select id, name, avatar from channels
    `;
    const channelByName = new Map(channels.map((channel) => [channel.name, channel]));
    const commenters = await sql<{ id: string }[]>`
      select id from users where email is null order by created_at limit 3
    `;
    if (commenters.length === 0) throw new Error("No comment users found");
    const [orderRow] = await sql<{ next: number }[]>`select coalesce(max(sort_order), 0) + 1 as next from videos`;
    let sortOrder = orderRow?.next ?? 1;
    const jobs: { slug: string; statusUrl: string; responseUrl: string }[] = [];

    for (const topic of topics) {
      const existing = await sql<{ slug: string }[]>`select slug from videos where slug = ${topic.slug}`;
      if (existing.length > 0) {
        console.log(`exists ${topic.slug}`);
        continue;
      }
      const channel = channelByName.get(topic.channel);
      if (!channel) throw new Error(`Missing channel ${topic.channel}`);
      console.log(`image ${topic.slug}`);
      const bytes = await generateStill(key, topic.imagePrompt);
      const thumbnail = await uploadImage(bytes, `${topic.slug}.jpg`, imageIdFor(`thumbnails/${topic.slug}.jpg`, bytes));
      const embedding = vectorLiteral(await clipImageEmbedding(thumbnail));
      const id = randomUUID();
      await sql`
        insert into videos (
          id, slug, channel_id, channel_name, title, genre, topic, live, duration, views, view_count,
          uploaded, recency, thumbnail, avatar, overlay, align, shelf, new_release, spoiler_free,
          top_rated, subscribed, unlisted, source, like_count, sort_order, thumbnail_embedding
        ) values (
          ${id}, ${topic.slug}, ${channel.id}, ${channel.name}, ${topic.title}, ${topic.genre}, null, false,
          ${topic.duration}, ${topic.views}, ${topic.viewCount}, ${topic.uploaded}, ${sortOrder},
          ${thumbnail}, ${channel.avatar}, ${sql.json(overlay(topic.title))}, ${topic.align}, 'fresh',
          true, true, false, true, false, 'feed', ${400 + sortOrder}, ${sortOrder},
          ${embedding}::extensions.vector
        )
      `;
      for (const [index, commenter] of commenters.entries()) {
        await sql`
          insert into comments (id, video_id, user_id, body, posted, likes, sort_order)
          values (
            ${randomUUID()}, ${id}, ${commenter.id},
            ${index === 0 ? `This is the ${channel.name} video I send when someone asks where to start.` : "Rewound the example twice. That is a good sign."},
            ${index === 0 ? "1 day ago" : `${index + 1} days ago`},
            ${20 + index * 7}, ${index}
          )
        `;
      }
      await sql`update channels set video_count = video_count + 1 where id = ${channel.id}`;
      const queued = await fal(key, `https://queue.fal.run/${FAL_CHEAPEST_IMAGE_TO_VIDEO}`, {
        method: "POST",
        body: JSON.stringify(
          falImageToVideoBody(
            thumbnail,
            `Cinematic 5-second clip. ${topic.motion} No text, logos, or famous characters.`,
          ),
        ),
      });
      jobs.push({ slug: topic.slug, statusUrl: queued.status_url, responseUrl: queued.response_url });
      sortOrder += 1;
      console.log(`saved ${topic.slug}`);
    }

    const pending = new Map(jobs.map((job) => [job.slug, job]));
    const started = Date.now();
    while (pending.size > 0 && Date.now() - started < 12 * 60 * 1000) {
      for (const job of [...pending.values()]) {
        const status = await fal(key, job.statusUrl);
        if (status.status !== "COMPLETED") {
          if (status.status === "FAILED" || status.status === "ERROR") {
            console.error(`clip failed ${job.slug}`);
            pending.delete(job.slug);
          }
          continue;
        }
        const result = await fal(key, job.responseUrl);
        const url = result.video?.url as string | undefined;
        if (!url) throw new Error(`no video url for ${job.slug}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`video download ${response.status} for ${job.slug}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const playback = await uploadVideo(bytes, `${job.slug}.mp4`, job.slug);
        await sql`update videos set playback = ${playback} where slug = ${job.slug}`;
        pending.delete(job.slug);
        console.log(`playback ${job.slug}`);
      }
      if (pending.size > 0) await new Promise((resolve) => setTimeout(resolve, 8000));
    }
    if (pending.size > 0) console.error(`playback still waiting: ${[...pending.keys()].join(", ")}`);
    console.log("done");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(redact(error));
  process.exit(1);
});
