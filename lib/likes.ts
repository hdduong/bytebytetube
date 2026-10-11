"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { videos } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validSlug } from "@/lib/like-taste";
import { likedSlugsForUser, recommendedSlugsForUser, writeVideoLike } from "@/lib/likes-data";

type LikeResult =
  | { status: "ok"; likedIds: string[]; recommendedIds: string[] }
  | { status: "signin" }
  | { status: "error" };

async function sessionUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function viewerLikes() {
  const userId = await sessionUserId();
  if (!userId) return [] as string[];
  return likedSlugsForUser(userId);
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
      await writeVideoLike(userId, video.id, true);
    } else {
      await writeVideoLike(userId, video.id, false);
    }
    const likedIds = await likedSlugsForUser(userId);
    const recommended = await recommendedSlugsForUser(userId);
    return { status: "ok", likedIds, recommendedIds: recommended ?? [] };
  } catch {
    return { status: "error" };
  }
}
