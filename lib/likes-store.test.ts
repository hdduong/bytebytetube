import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const text = await readFile(path.join(process.cwd(), ".env"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[name]) process.env[name] = value;
  }
}

test("likes stay with the user who saved them and drive recommendations", async () => {
  await loadEnv();
  const { eq, inArray, sql } = await import("drizzle-orm");
  const { users, videoLikes, videos } = await import("../drizzle/schema");
  const { db } = await import("./db");
  const { likedSlugsForUser, recommendedSlugsForUser } = await import("./likes-data");
  const catalog = await db
    .select({ id: videos.id, slug: videos.slug })
    .from(videos)
    .where(
      sql`${videos.thumbnailEmbedding} is not null and ${videos.unlisted} = false and ${videos.topic} is null and ${videos.source} <> 'short'`,
    )
    .limit(2);
  assert.equal(catalog.length, 2);
  const [first, second] = catalog;
  assert.ok(first && second);
  const stamp = Date.now();
  const created = await db
    .insert(users)
    .values([
      { name: "Like A", email: `like-a-${stamp}@example.com`, handle: `@likea${stamp}`, avatar: "" },
      { name: "Like B", email: `like-b-${stamp}@example.com`, handle: `@likeb${stamp}`, avatar: "" },
    ])
    .returning({ id: users.id });
  const [left, right] = created;
  assert.ok(left && right);
  try {
    await db.insert(videoLikes).values([
      { userId: left.id, videoId: first.id },
      { userId: right.id, videoId: second.id },
    ]);
    const duplicate = await db
      .insert(videoLikes)
      .values({ userId: left.id, videoId: first.id })
      .onConflictDoNothing()
      .returning({ videoId: videoLikes.videoId });
    assert.equal(duplicate.length, 0);
    assert.deepEqual(await likedSlugsForUser(left.id), [first.slug]);
    assert.deepEqual(await likedSlugsForUser(right.id), [second.slug]);
    const recommended = await recommendedSlugsForUser(left.id);
    assert.ok(recommended);
    assert.equal(recommended.includes(first.slug), false);
    assert.ok(recommended.length > 0);
    assert.equal(await recommendedSlugsForUser("00000000-0000-0000-0000-000000000000"), null);
  } finally {
    await db.delete(users).where(inArray(users.id, [left.id, right.id]));
    const leftover = await db
      .select({ videoId: videoLikes.videoId })
      .from(videoLikes)
      .where(eq(videoLikes.userId, left.id));
    assert.equal(leftover.length, 0);
  }
  const { closeDatabase } = await import("./db");
  await closeDatabase();
});
