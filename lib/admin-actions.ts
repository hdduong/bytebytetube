"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { account, channels, comments, users, videos } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import type { OverlayPart } from "@/lib/videos";
import { clipImageEmbedding } from "../scripts/clip-embedding";

const sources = ["feed", "explore", "channel", "short"] as const;
const aligns = ["left", "center", "right"] as const;
const shelves = ["fresh", "popular"] as const;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function canonicalUserId(value: string) {
  const id = value.trim().replace(/^\{|\}$/g, "").toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return "";
  return id;
}

function flag(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function wholeNumber(formData: FormData, name: string) {
  const raw = text(formData, name);
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be a whole number.`);
  }
  return value;
}

function postgresField(error: unknown, field: string) {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    if (field in current) {
      const value = current[field as keyof typeof current];
      if (typeof value === "string") return value;
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

function dbMessage(error: unknown) {
  const code = postgresField(error, "code");
  if (code === "23505") {
    const constraint = postgresField(error, "constraint_name") ?? "";
    if (constraint.includes("email")) return "A record with that email already exists.";
    return "A record with that slug or handle already exists.";
  }
  if (code === "23503") return "Another record still uses this one. Delete or reassign those first.";
  if (code === "22P02") return "That id is not a valid UID.";
  if (error instanceof Error && error.message && !error.message.startsWith("Failed query")) return error.message;
  return "Could not save that record.";
}

function bail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function embeddingFor(thumbnail: string, back: string) {
  try {
    return await clipImageEmbedding(thumbnail);
  } catch {
    bail(back, "Could not embed that thumbnail.");
  }
}

function refresh() {
  revalidatePath("/", "layout");
}

function parseOverlay(raw: string): OverlayPart[][] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error("Overlay must be a JSON array.");
    return value as OverlayPart[][];
  } catch (error) {
    if (error instanceof Error && error.message === "Overlay must be a JSON array.") throw error;
    throw new Error("Overlay must be valid JSON.");
  }
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  const handle = text(formData, "handle");
  const avatar = text(formData, "avatar");
  const email = text(formData, "email").toLowerCase();
  const admin = flag(formData, "admin");
  if (!name || !handle || !avatar) bail("/admin/users", "Name, handle, and avatar are required.");
  if (email || admin) {
    bail("/admin/users", "Sign-in accounts are created on the sign-up page. A catalog user cannot have an email or admin access.");
  }
  let id = "";
  try {
    const [created] = await db.insert(users).values({ name, handle, avatar }).returning({ id: users.id });
    id = created?.id ?? "";
  } catch (error) {
    bail("/admin/users", dbMessage(error));
  }
  if (!id) bail("/admin/users", "Could not save that record.");
  refresh();
  redirect(`/admin/users/${id}?saved=1`);
}

export async function updateUser(formData: FormData) {
  const session = await requireAdmin();
  const id = canonicalUserId(text(formData, "id"));
  const name = text(formData, "name");
  const handle = text(formData, "handle");
  const avatar = text(formData, "avatar");
  const email = text(formData, "email").toLowerCase();
  const admin = flag(formData, "admin");
  const back = `/admin/users/${encodeURIComponent(id)}`;
  if (!id || !name || !handle || !avatar) bail(back, "Name, handle, and avatar are required.");
  if (canonicalUserId(session.user.id) === id && !admin) bail(back, "You cannot remove your own admin access.");
  const [credential] = await db.select({ id: account.id }).from(account).where(eq(account.userId, id)).limit(1);
  if (credential && !email) bail(back, "This user signs in with that email, so it cannot be cleared.");
  if (!credential && (email || admin)) {
    bail(back, "This user has no sign-in. Leave email blank and admin off.");
  }
  try {
    await db
      .update(users)
      .set({ name, handle, avatar, email: email || null, admin, updatedAt: new Date() })
      .where(eq(users.id, id));
  } catch (error) {
    bail(back, dbMessage(error));
  }
  refresh();
  redirect(`${back}?saved=1`);
}

export async function deleteUser(formData: FormData) {
  const session = await requireAdmin();
  const id = canonicalUserId(text(formData, "id"));
  if (!id) bail("/admin/users", "Missing user id.");
  if (canonicalUserId(session.user.id) === id) bail("/admin/users", "You cannot delete your own account.");
  try {
    const removed = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (removed.length === 0) bail("/admin/users", "User was not found.");
  } catch (error) {
    bail("/admin/users", dbMessage(error));
  }
  refresh();
  redirect("/admin/users");
}

export async function createChannel(formData: FormData) {
  await requireAdmin();
  const values = channelValues(formData, "/admin/channels");
  if (!values) bail("/admin/channels", "Slug, name, handle, owner, and the text fields are required.");
  const { id: _id, ...insertValues } = values;
  let id = "";
  try {
    const [created] = await db.insert(channels).values(insertValues).returning({ id: channels.id });
    id = created?.id ?? "";
  } catch (error) {
    bail("/admin/channels", dbMessage(error));
  }
  if (!id) bail("/admin/channels", "Could not save that record.");
  refresh();
  redirect(`/admin/channels/${id}?saved=1`);
}

export async function updateChannel(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const back = `/admin/channels/${id}`;
  const values = channelValues(formData, back);
  if (!values || !id) bail(back || "/admin/channels", "Name, handle, owner, and the text fields are required.");
  try {
    const { id: channelId, ...rest } = values;
    await db.update(channels).set(rest).where(eq(channels.id, channelId));
  } catch (error) {
    bail(back, dbMessage(error));
  }
  refresh();
  redirect(`${back}?saved=1`);
}

export async function deleteChannel(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) bail("/admin/channels", "Missing channel id.");
  try {
    const removed = await db.delete(channels).where(eq(channels.id, id)).returning({ id: channels.id });
    if (removed.length === 0) bail("/admin/channels", "Channel was not found.");
  } catch (error) {
    bail("/admin/channels", dbMessage(error));
  }
  refresh();
  redirect("/admin/channels");
}

function channelValues(formData: FormData, back: string) {
  const id = text(formData, "id");
  const slug = text(formData, "slug");
  const name = text(formData, "name");
  const handle = text(formData, "handle");
  const avatar = text(formData, "avatar");
  const banner = text(formData, "banner");
  const bannerTitle = text(formData, "bannerTitle");
  const tagline = text(formData, "tagline");
  const bio = text(formData, "bio");
  const about = text(formData, "about");
  const subscribers = text(formData, "subscribers");
  const ownerId = text(formData, "ownerId");
  let videoCount = 0;
  try {
    videoCount = wholeNumber(formData, "videoCount");
  } catch (error) {
    bail(back, error instanceof Error ? error.message : "Video count must be a whole number.");
  }
  if (!slug || !name || !handle || !avatar || !banner || !bannerTitle || !tagline || !bio || !about || !subscribers || !ownerId) {
    return null;
  }
  return { id, slug, name, handle, avatar, banner, bannerTitle, tagline, bio, about, subscribers, videoCount, ownerId };
}

async function requireUniqueThumbnail(thumbnail: string, back: string, exceptId?: string) {
  const match = await db
    .select({ id: videos.id })
    .from(videos)
    .where(exceptId ? and(eq(videos.thumbnail, thumbnail), ne(videos.id, exceptId)) : eq(videos.thumbnail, thumbnail))
    .limit(1);
  if (match.length > 0) bail(back, "That thumbnail is already used by another video.");
}

export async function createVideo(formData: FormData) {
  await requireAdmin();
  const parsed = videoValues(formData, "/admin/videos");
  const { id: _id, ...insertValues } = parsed;
  await requireUniqueThumbnail(insertValues.thumbnail, "/admin/videos");
  const thumbnailEmbedding = await embeddingFor(insertValues.thumbnail, "/admin/videos");
  let id = "";
  try {
    const [created] = await db.insert(videos).values({ ...insertValues, thumbnailEmbedding }).returning({ id: videos.id });
    id = created?.id ?? "";
  } catch (error) {
    bail("/admin/videos", dbMessage(error));
  }
  if (!id) bail("/admin/videos", "Could not save that record.");
  refresh();
  redirect(`/admin/videos/${id}?saved=1`);
}

export async function updateVideo(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const back = `/admin/videos/${id}`;
  const parsed = videoValues(formData, back);
  if (!parsed.id) bail("/admin/videos", "Missing video id.");
  const { id: videoId, ...rest } = parsed;
  await requireUniqueThumbnail(rest.thumbnail, back, videoId);
  const [current] = await db
    .select({ thumbnail: videos.thumbnail, thumbnailEmbedding: videos.thumbnailEmbedding })
    .from(videos)
    .where(eq(videos.id, videoId));
  const thumbnailEmbedding =
    current && current.thumbnail === rest.thumbnail && current.thumbnailEmbedding
      ? current.thumbnailEmbedding
      : await embeddingFor(rest.thumbnail, back);
  try {
    await db.update(videos).set({ ...rest, thumbnailEmbedding }).where(eq(videos.id, videoId));
  } catch (error) {
    bail(back, dbMessage(error));
  }
  refresh();
  redirect(`${back}?saved=1`);
}

export async function deleteVideo(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) bail("/admin/videos", "Missing video id.");
  try {
    const removed = await db.delete(videos).where(eq(videos.id, id)).returning({ id: videos.id });
    if (removed.length === 0) bail("/admin/videos", "Video was not found.");
  } catch (error) {
    bail("/admin/videos", dbMessage(error));
  }
  refresh();
  redirect("/admin/videos");
}

function videoValues(formData: FormData, back: string) {
  const id = text(formData, "id");
  const slug = text(formData, "slug");
  const channelId = text(formData, "channelId");
  const channelName = text(formData, "channelName");
  const title = text(formData, "title");
  const duration = text(formData, "duration");
  const views = text(formData, "views");
  const uploaded = text(formData, "uploaded");
  const thumbnail = text(formData, "thumbnail");
  const avatar = text(formData, "avatar");
  const source = text(formData, "source");
  const align = text(formData, "align");
  const shelf = text(formData, "shelf");
  if (!slug || !channelId || !channelName || !title || !duration || !views || !uploaded || !thumbnail || !avatar) {
    bail(back, "Slug, channel, title, duration, views, uploaded, thumbnail, and avatar are required.");
  }
  if (!sources.includes(source as (typeof sources)[number])) bail(back, "Pick a source.");
  if (!aligns.includes(align as (typeof aligns)[number])) bail(back, "Pick an alignment.");
  if (!shelves.includes(shelf as (typeof shelves)[number])) bail(back, "Pick a shelf.");
  let viewCount = 0;
  let recency = 0;
  let likeCount = 0;
  let sortOrder = 0;
  let overlay: OverlayPart[][] = [];
  try {
    viewCount = wholeNumber(formData, "viewCount");
    recency = wholeNumber(formData, "recency");
    likeCount = wholeNumber(formData, "likeCount");
    sortOrder = wholeNumber(formData, "sortOrder");
    overlay = parseOverlay(text(formData, "overlay") || "[]");
  } catch (error) {
    bail(back, error instanceof Error ? error.message : "Check the numbers and overlay JSON.");
  }
  return {
    id,
    slug,
    channelId,
    channelName,
    title,
    genre: text(formData, "genre") || null,
    topic: text(formData, "topic") || null,
    live: flag(formData, "live"),
    duration,
    views,
    viewCount,
    uploaded,
    recency,
    thumbnail,
    avatar,
    overlay,
    align,
    shelf,
    newRelease: flag(formData, "newRelease"),
    spoilerFree: flag(formData, "spoilerFree"),
    topRated: flag(formData, "topRated"),
    subscribed: flag(formData, "subscribed"),
    unlisted: flag(formData, "unlisted"),
    source,
    likeCount,
    sortOrder,
  };
}

export async function createComment(formData: FormData) {
  await requireAdmin();
  const values = commentValues(formData, "/admin/comments");
  const { id: _id, ...insertValues } = values;
  let id = "";
  try {
    const [created] = await db.insert(comments).values(insertValues).returning({ id: comments.id });
    id = created?.id ?? "";
  } catch (error) {
    bail("/admin/comments", dbMessage(error));
  }
  if (!id) bail("/admin/comments", "Could not save that record.");
  refresh();
  redirect(`/admin/comments/${id}?saved=1`);
}

export async function updateComment(formData: FormData) {
  await requireAdmin();
  const back = `/admin/comments/${encodeURIComponent(text(formData, "id"))}`;
  const values = commentValues(formData, back);
  const { id, ...rest } = values;
  try {
    await db.update(comments).set(rest).where(eq(comments.id, id));
  } catch (error) {
    bail(back, dbMessage(error));
  }
  refresh();
  redirect(`${back}?saved=1`);
}

export async function deleteComment(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) bail("/admin/comments", "Missing comment id.");
  try {
    const removed = await db.delete(comments).where(eq(comments.id, id)).returning({ id: comments.id });
    if (removed.length === 0) bail("/admin/comments", "Comment was not found.");
  } catch (error) {
    bail("/admin/comments", dbMessage(error));
  }
  refresh();
  redirect("/admin/comments");
}

function commentValues(formData: FormData, back: string) {
  const videoId = text(formData, "videoId");
  const userId = text(formData, "userId");
  const body = text(formData, "body");
  const posted = text(formData, "posted");
  const id = text(formData, "id");
  if (!videoId || !userId || !body || !posted) {
    bail(back, "Video, user, comment, and posted time are required.");
  }
  let likes = 0;
  let sortOrder = 0;
  try {
    likes = wholeNumber(formData, "likes");
    sortOrder = wholeNumber(formData, "sortOrder");
  } catch (error) {
    bail(back, error instanceof Error ? error.message : "Likes and sort order must be whole numbers.");
  }
  return { id, videoId, userId, body, posted, likes, sortOrder };
}
