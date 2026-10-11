"use server";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { videoLikes, videos } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { averageEmbeddings, validSlug, vectorLiteral } from "@/lib/like-taste";

type LikeResult =
  | { status: "ok"; likedIds: string[]; recommendedIds: string[] }
  | { status: "signin" }
  | { status: "error" };

async function sessionUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function likedSlugsForUser(userId: string) {
  const rows = await db
    .select({ slug: videos.slug })
    .from(videoLikes)
    .innerJoin(videos, eq(videos.id, videoLikes.videoId))
    .where(eq(videoLikes.userId, userId));
  return rows.map((row) => row.slug);
}

export async function recommendedSlugsForUser(userId: string) {
  const embeddings = await db.execute<{ embedding: string | null }>(sql`
    select videos.thumbnail_embedding::text as embedding
    from video_likes
    inner join videos on videos.id = video_likes.video_id
    where video_likes.user_id = ${userId}
      and videos.thumbnail_embedding is not null
  `);
  const taste = averageEmbeddings([...embeddings].map((row) => row.embedding));
  const literal = taste ? vectorLiteral(taste) : null;
  if (!literal) return null;
  const rows = await db.execute<{ slug: string }>(sql`
    select slug
    from videos
    where thumbnail_embedding is not null
      and unlisted = false
      and topic is null
      and source <> 'short'
      and not exists (
        select 1 from video_likes
        where video_likes.video_id = videos.id
          and video_likes.user_id = ${userId}
      )
    order by thumbnail_embedding <=> ${literal}::extensions.vector
    limit 8
  `);
  return [...rows].map((row) => String(row.slug));
}

export async function viewerLibrary() {
  const userId = await sessionUserId();
  if (!userId) return { likedIds: [] as string[], recommendedIds: [] as string[] };
  const likedIds = await likedSlugsForUser(userId);
  const recommended = await recommendedSlugsForUser(userId);
  return { likedIds, recommendedIds: recommended ?? [] };
}

export async function setVideoLike(slug: unknown, liked: unknown): Promise<LikeResult> {
  if (!validSlug(slug) || typeof liked !== "boolean") return { status: "error" };
  const userId = await sessionUserId();
  if (!userId) return { status: "signin" };
  try {
    const [video] = await db.select({ id: videos.id }).from(videos).where(eq(videos.slug, slug)).limit(1);
    if (!video) return { status: "error" };
    if (liked) {
      await db.insert(videoLikes).values({ userId, videoId: video.id }).onConflictDoNothing();
    } else {
      await db.delete(videoLikes).where(and(eq(videoLikes.userId, userId), eq(videoLikes.videoId, video.id)));
    }
    const likedIds = await likedSlugsForUser(userId);
    const recommended = await recommendedSlugsForUser(userId);
    return { status: "ok", likedIds, recommendedIds: recommended ?? [] };
  } catch {
    return { status: "error" };
  }
}
