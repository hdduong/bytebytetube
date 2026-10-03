import { count, eq, ilike, or, sql } from "drizzle-orm";
import { channels, comments, users, videos } from "@/drizzle/schema";
import { db } from "@/lib/db";

function likeTerm(value: string) {
  return `%${value.replace(/[%_\\]/g, "")}%`;
}

export async function adminCounts() {
  const [userCount, channelCount, videoCount, commentCount] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(channels),
    db.select({ value: count() }).from(videos),
    db.select({ value: count() }).from(comments),
  ]);
  return {
    users: Number(userCount[0]?.value ?? 0),
    channels: Number(channelCount[0]?.value ?? 0),
    videos: Number(videoCount[0]?.value ?? 0),
    comments: Number(commentCount[0]?.value ?? 0),
  };
}

export async function listUsers(query: string) {
  const rows = db.select().from(users).orderBy(users.name);
  if (!query) return rows;
  const term = likeTerm(query);
  return db
    .select()
    .from(users)
    .where(or(ilike(users.name, term), ilike(users.handle, term), sql`${users.id}::text ILIKE ${term}`))
    .orderBy(users.name);
}

export async function getUser(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function listChannels(query: string) {
  if (!query) return db.select().from(channels).orderBy(channels.name);
  const term = likeTerm(query);
  return db
    .select()
    .from(channels)
    .where(
      or(
        ilike(channels.name, term),
        ilike(channels.handle, term),
        ilike(channels.slug, term),
        sql`${channels.id}::text ILIKE ${term}`,
      ),
    )
    .orderBy(channels.name);
}

export async function getChannelRecord(id: string) {
  const [row] = await db.select().from(channels).where(eq(channels.id, id));
  return row ?? null;
}

export async function listVideos(query: string) {
  if (!query) return db.select().from(videos).orderBy(videos.sortOrder, videos.title);
  const term = likeTerm(query);
  return db
    .select()
    .from(videos)
    .where(
      or(
        ilike(videos.title, term),
        ilike(videos.channelName, term),
        ilike(videos.slug, term),
        sql`${videos.id}::text ILIKE ${term}`,
      ),
    )
    .orderBy(videos.sortOrder, videos.title);
}

export async function getVideo(id: string) {
  const [row] = await db.select().from(videos).where(eq(videos.id, id));
  return row ?? null;
}

const commentList = {
  id: comments.id,
  body: comments.body,
  likes: comments.likes,
  videoId: comments.videoId,
  videoTitle: videos.title,
  userName: users.name,
};

export async function listComments(query: string) {
  const rows = db
    .select(commentList)
    .from(comments)
    .innerJoin(videos, eq(comments.videoId, videos.id))
    .innerJoin(users, eq(comments.userId, users.id))
    .orderBy(videos.title, comments.sortOrder);
  if (!query) return rows;
  const term = likeTerm(query);
  return db
    .select(commentList)
    .from(comments)
    .innerJoin(videos, eq(comments.videoId, videos.id))
    .innerJoin(users, eq(comments.userId, users.id))
    .where(or(ilike(comments.body, term), ilike(videos.title, term), sql`${comments.id}::text ILIKE ${term}`))
    .orderBy(videos.title, comments.sortOrder);
}

export async function getComment(id: string) {
  const [row] = await db.select().from(comments).where(eq(comments.id, id));
  return row ?? null;
}

export async function userOptions() {
  return db.select({ id: users.id, name: users.name, handle: users.handle }).from(users).orderBy(users.name);
}

export async function channelOptions() {
  return db
    .select({ id: channels.id, slug: channels.slug, name: channels.name, avatar: channels.avatar })
    .from(channels)
    .orderBy(channels.name);
}

export async function videoOptions() {
  return db.select({ id: videos.id, title: videos.title }).from(videos).orderBy(videos.title);
}
