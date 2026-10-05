import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import postgres from "postgres";

const ENDPOINT = "https://fal.run/openrouter/router";
const AVATAR_ENDPOINT = "https://fal.run/bytedance/seedream/v5/lite/text-to-image";
const MODEL = "google/gemini-3.5-flash";
const ROOT = process.cwd();
const AVATAR_DIR = path.join(ROOT, "public", "avatars");

const handle = z
  .string()
  .regex(/^@[A-Za-z0-9_]{2,30}$/, "handle must look like @Name");

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase words separated by hyphens");

const generatedCatalogSchema = z
  .object({
    users: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          handle,
          avatarPrompt: z.string().trim().min(20).max(800),
          channel: z.object({
            name: z.string().trim().min(1).max(80),
            slug,
            handle,
            tagline: z.string().trim().min(1).max(120),
            bio: z.string().trim().min(1).max(240),
            about: z.string().trim().min(1).max(500),
            subscribers: z.string().trim().min(1).max(40),
            bannerTitle: z.string().trim().min(1).max(80),
          }),
        }),
      )
      .min(1),
  })
  .superRefine((catalog, context) => {
    const userHandles = new Set<string>();
    const channelHandles = new Set<string>();
    const slugs = new Set<string>();
    for (const [index, user] of catalog.users.entries()) {
      const pairs: [Set<string>, string][] = [
        [userHandles, user.handle],
        [channelHandles, user.channel.handle],
        [slugs, user.channel.slug],
      ];
      for (const [seen, value] of pairs) {
        const key = value.toLowerCase();
        if (seen.has(key)) {
          context.addIssue({
            code: "custom",
            message: `duplicate ${value}`,
            path: ["users", index],
          });
        }
        seen.add(key);
      }
    }
  });

type GeneratedCatalog = z.infer<typeof generatedCatalogSchema>;

const missingAvatarSchema = z
  .object({
    users: z
      .array(
        z.object({
          handle,
          avatarPrompt: z.string().trim().min(20).max(800),
        }),
      )
      .min(1),
  })
  .superRefine((catalog, context) => {
    const seen = new Set<string>();
    for (const [index, user] of catalog.users.entries()) {
      const key = user.handle.toLowerCase();
      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          message: `duplicate ${user.handle}`,
          path: ["users", index],
        });
      }
      seen.add(key);
    }
  });

type Sql = ReturnType<typeof postgres>;

type MissingUser = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  slug: string | null;
  channelName: string | null;
  tagline: string | null;
  bio: string | null;
  about: string | null;
};

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

function parseCount(argv: string[]) {
  const raw = argv[2] ?? "6";
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error("Pass a user count from 1 to 20. Example: npx tsx scripts/generate-users.ts 6");
  }
  return count;
}

function extractJson(output: string) {
  const trimmed = output.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1].trim() : trimmed) as unknown;
}

function promptFor(count: number, taken: string[]) {
  const avoid = taken.length > 0 ? `Do not reuse these handles or slugs: ${taken.join(", ")}.` : "";
  return [
    `Create ${count} fake CinemaTube users. Each user owns exactly one movie-review channel.`,
    "Return JSON only, with no markdown.",
    avoid,
    "Do not include image files or urls. Include avatarPrompt, a text prompt for a square 1:1 portrait of that fictional person.",
    "Each avatarPrompt is original, names no real actor or celebrity, and asks for a head-and-shoulders photo with no text, logos, or watermarks.",
    "Handles start with @ and use letters, numbers, or underscores.",
    "Channel slugs are lowercase hyphenated words.",
    "subscribers is a short label such as \"18K subscribers\".",
    "bannerTitle is the channel name in uppercase.",
    '{"users":[{"name":"","handle":"","avatarPrompt":"","channel":{"name":"","slug":"","handle":"","tagline":"","bio":"","about":"","subscribers":"","bannerTitle":""}}]}',
  ]
    .filter(Boolean)
    .join("\n");
}

async function complete(key: string, prompt: string) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      system_prompt: "You write original fictional creator profiles. Reply with valid JSON and nothing else.",
      model: MODEL,
      reasoning: true,
      temperature: 0.8,
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`fal ${response.status}: ${body.slice(0, 500)}`);
  const result = JSON.parse(body) as { output?: string; error?: string };
  if (result.error) throw new Error(result.error);
  if (!result.output) throw new Error("fal returned no output");
  return extractJson(result.output);
}

async function generateCatalog(key: string, count: number, taken: string[]) {
  return complete(key, promptFor(count, taken));
}

function promptForMissing(users: MissingUser[]) {
  const profiles = users.map((user) => ({
    name: user.name,
    handle: user.handle,
    channel: user.channelName,
    tagline: user.tagline,
    bio: user.bio,
    about: user.about,
  }));
  return [
    "Write an avatarPrompt for each existing user below.",
    "Return JSON only, with no markdown.",
    "Use the exact handles given. Do not add or omit users.",
    "Each avatarPrompt describes a square 1:1 head-and-shoulders portrait of that fictional person.",
    "Name no real actor or celebrity. Ask for no text, logos, or watermarks.",
    JSON.stringify(profiles),
    '{"users":[{"handle":"","avatarPrompt":""}]}',
  ].join("\n");
}

async function fileExists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function usersMissingAvatars(sql: Sql) {
  const rows = await sql<
    {
      id: string;
      name: string;
      handle: string;
      avatar: string;
      slug: string | null;
      channel_name: string | null;
      tagline: string | null;
      bio: string | null;
      about: string | null;
    }[]
  >`
    select u.id, u.name, u.handle, u.avatar,
      c.slug, c.name as channel_name, c.tagline, c.bio, c.about
    from users u
    left join lateral (
      select slug, name, tagline, bio, about
      from channels
      where owner_id = u.id
      order by slug
      limit 1
    ) c on true
    order by u.name
  `;
  const missing: MissingUser[] = [];
  for (const row of rows) {
    const stored = row.avatar;
    const avatar = stored.trim();
    const onDisk = avatar.startsWith("/") && (await fileExists(path.join(ROOT, "public", avatar.slice(1))));
    if (avatar && onDisk) continue;
    missing.push({
      id: row.id,
      name: row.name,
      handle: row.handle,
      avatar: stored,
      slug: row.slug,
      channelName: row.channel_name,
      tagline: row.tagline,
      bio: row.bio,
      about: row.about,
    });
  }
  return missing;
}

function fileSlug(user: MissingUser) {
  if (user.slug) return user.slug;
  return user.handle.replace(/^@/, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
}

async function fillMissingAvatars(sql: Sql, key: string) {
  const missing = await usersMissingAvatars(sql);
  if (missing.length === 0) {
    console.log("Every user already has an avatar.");
    return;
  }
  console.log(`Users without an avatar: ${missing.map((user) => user.handle).join(", ")}`);

  const parsed = missingAvatarSchema.safeParse(await complete(key, promptForMissing(missing)));
  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error));
    process.exitCode = 1;
    return;
  }
  const prompts = new Map(parsed.data.users.map((user) => [user.handle.toLowerCase(), user.avatarPrompt]));
  const absent = missing.filter((user) => !prompts.has(user.handle.toLowerCase()));
  if (absent.length > 0) {
    throw new Error(`No avatar prompt for ${absent.map((user) => user.handle).join(", ")}`);
  }

  for (const user of missing) {
    const avatarPrompt = prompts.get(user.handle.toLowerCase());
    if (!avatarPrompt) throw new Error(`No avatar prompt for ${user.handle}`);
    const avatar = await createAvatar(key, avatarPrompt, fileSlug(user));
    await sql.begin(async (tx) => {
      await tx`update users set avatar = ${avatar} where id = ${user.id}`;
      await tx`
        update channels
        set avatar = ${avatar}
        where owner_id = ${user.id} and (btrim(avatar) = '' or avatar = ${user.avatar})
      `;
    });
    console.log(`avatar ${user.handle} -> ${avatar}`);
  }
  console.log(`Updated ${missing.length} avatars`);
}

function extensionFor(contentType: string | null, url: string) {
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  if (contentType?.includes("webp")) return "webp";
  if (url.toLowerCase().includes(".jpg") || url.toLowerCase().includes(".jpeg")) return "jpg";
  if (url.toLowerCase().includes(".webp")) return "webp";
  return "png";
}

async function createAvatar(key: string, prompt: string, slug: string) {
  const response = await fetch(AVATAR_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: "square_hd",
      num_images: 1,
      max_images: 1,
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`fal avatar ${response.status}: ${body.slice(0, 500)}`);
  const result = JSON.parse(body) as { images?: { url?: string; content_type?: string | null }[] };
  const image = result.images?.[0];
  if (!image?.url) throw new Error(`fal returned no avatar for ${slug}`);
  const file = await fetch(image.url);
  if (!file.ok) throw new Error(`avatar download failed for ${slug}: ${file.status}`);
  const extension = extensionFor(file.headers.get("content-type") ?? image.content_type ?? null, image.url);
  const filename = `${slug}.${extension}`;
  await mkdir(AVATAR_DIR, { recursive: true });
  await writeFile(path.join(AVATAR_DIR, filename), Buffer.from(await file.arrayBuffer()));
  return `/avatars/${filename}`;
}

async function main() {
  loadEnv(await readFile(path.join(ROOT, ".env"), "utf8"));
  const key = process.env.FAL_KEY;
  const connectionString = process.env.DATABASE_URL?.replace(":6543/", ":5432/");
  if (!key) throw new Error("FAL_KEY is not set");
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = postgres(connectionString, { prepare: false });
  await sql`set default_transaction_read_only = off`;
  if (process.argv.includes("--missing")) {
    try {
      await fillMissingAvatars(sql, key);
    } finally {
      await sql.end();
    }
    return;
  }
  const count = parseCount(process.argv);
  const existing = await sql<{ value: string }[]>`
    select handle as value from users
    union
    select handle from channels
    union
    select slug from channels
  `;
  const taken = existing.map((row) => row.value);

  const parsed = generatedCatalogSchema.safeParse(await generateCatalog(key, count, taken));
  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error));
    await sql.end();
    process.exitCode = 1;
    return;
  }
  const catalog: GeneratedCatalog = parsed.data;
  if (catalog.users.length !== count) {
    console.error(`Expected ${count} users, got ${catalog.users.length}`);
    await sql.end();
    process.exitCode = 1;
    return;
  }
  const collisions = catalog.users.flatMap((user) =>
    [user.handle, user.channel.handle, user.channel.slug].filter((value) =>
      taken.some((item) => item.toLowerCase() === value.toLowerCase()),
    ),
  );
  if (collisions.length > 0) {
    throw new Error(`Generated values already exist: ${collisions.join(", ")}`);
  }

  console.log(JSON.stringify(catalog, null, 2));

  const avatars = new Map<string, string>();
  for (const user of catalog.users) {
    const avatar = await createAvatar(key, user.avatarPrompt, user.channel.slug);
    avatars.set(user.channel.slug, avatar);
    console.log(`avatar ${user.handle} -> ${avatar}`);
  }

  await sql.begin(async (tx) => {
    for (const user of catalog.users) {
      const avatar = avatars.get(user.channel.slug);
      if (!avatar) throw new Error(`Missing avatar for ${user.handle}`);
      const [created] = await tx<{ id: string }[]>`
        insert into users (name, handle, avatar)
        values (${user.name}, ${user.handle}, ${avatar})
        returning id
      `;
      await tx`
        insert into channels (
          slug, name, handle, avatar, banner, banner_title, tagline, bio, about, subscribers, video_count, owner_id
        )
        values (
          ${user.channel.slug},
          ${user.channel.name},
          ${user.channel.handle},
          ${avatar},
          '',
          ${user.channel.bannerTitle},
          ${user.channel.tagline},
          ${user.channel.bio},
          ${user.channel.about},
          ${user.channel.subscribers},
          0,
          ${created.id}
        )
      `;
    }
  });

  console.log(`Inserted ${catalog.users.length} users and ${catalog.users.length} channels`);
  await sql.end();
}

main().catch((error: unknown) => {
  console.error(redact(error));
  process.exit(1);
});
