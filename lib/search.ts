"use server";

import { sql } from "drizzle-orm";
import { clipTextEmbedding, vectorLiteral } from "../scripts/clip-embedding";
import { db } from "./db";

export async function searchCatalog(query: string) {
  const embedding = await clipTextEmbedding(query);
  if (!embedding) return [];
  const literal = vectorLiteral(embedding);
  const rows = await db.execute<{ slug: string; distance: string | number }>(sql`
    select slug, (thumbnail_embedding <=> ${literal}::extensions.vector) as distance
    from videos
    where thumbnail_embedding is not null
    order by distance
    limit 100
  `);
  return [...rows].map((row) => ({
    slug: String(row.slug),
    distance: Number(row.distance),
  }));
}

export async function relatedByThumbnail(slug: string, filter: "all" | "same" | "channel") {
  const rows = await db.execute<{ slug: string }>(sql`
    select other.slug
    from videos as current
    join videos as other
      on other.slug <> current.slug
     and other.thumbnail_embedding is not null
    where current.slug = ${slug}
      and current.thumbnail_embedding is not null
      and (
        (${filter} = 'all' and other.unlisted = false and other.topic is null)
        or (${filter} = 'channel' and other.channel_name = current.channel_name and other.topic is null)
        or (
          ${filter} = 'same'
          and other.unlisted = false
          and (
            (current.topic is not null and other.topic = current.topic)
            or (current.topic is null and other.topic is null and other.genre is not distinct from current.genre)
          )
        )
      )
    order by other.thumbnail_embedding <=> current.thumbnail_embedding
    limit 12
  `);
  return [...rows].map((row) => String(row.slug));
}
