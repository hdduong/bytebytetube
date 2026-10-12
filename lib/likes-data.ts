import { and, eq, sql } from "drizzle-orm";
import { videoLikes, videos } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { averageEmbeddings, vectorLiteral } from "@/lib/like-taste";

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

export async function writeVideoLike(userId: string, videoId: string, liked: boolean) {
  if (liked) {
    await db.insert(videoLikes).values({ userId, videoId }).onConflictDoNothing();
    return;
  }
  await db.delete(videoLikes).where(and(eq(videoLikes.userId, userId), eq(videoLikes.videoId, videoId)));
}
