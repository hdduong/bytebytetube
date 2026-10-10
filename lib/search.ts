"use server";

import { sql } from "drizzle-orm";
import { clipTextEmbedding, vectorLiteral } from "../scripts/clip-embedding";
import { db } from "./db";

const relevanceMargin = 0.015;

export async function searchCatalog(query: string) {
  const embedding = await clipTextEmbedding(query);
  if (!embedding) return [];
  const literal = vectorLiteral(embedding);
  const rows = await db.execute<{ slug: string; distance: string | number }>(sql`
    select slug, (thumbnail_embedding <=> ${literal}::extensions.vector) as distance
    from videos
    where thumbnail_embedding is not null
    order by distance
    limit 48
  `);
  const ranked = [...rows].map((row) => ({
    slug: String(row.slug),
    distance: Number(row.distance),
  }));
  const best = ranked[0]?.distance;
  if (best === undefined || Number.isNaN(best)) return [];
  return ranked.filter((row) => row.distance <= best + relevanceMargin).map((row) => row.slug);
}

export async function relatedByThumbnail(slug: string) {
  const rows = await db.execute<{ slug: string }>(sql`
    select other.slug
    from videos as current
    join videos as other
      on other.slug <> current.slug
     and other.thumbnail_embedding is not null
    where current.slug = ${slug}
      and current.thumbnail_embedding is not null
    order by other.thumbnail_embedding <=> current.thumbnail_embedding
    limit 80
  `);
  return [...rows].map((row) => String(row.slug));
}
