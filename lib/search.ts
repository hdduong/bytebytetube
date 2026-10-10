"use server";

import { sql } from "drizzle-orm";
import { clipTextEmbedding, vectorLiteral } from "../scripts/clip-embedding";
import { db } from "./db";
import type { SearchScope } from "./similarity";

export async function searchCatalog(query: string, scope: SearchScope = {}) {
  const embedding = await clipTextEmbedding(query);
  if (!embedding) return [];
  const literal = vectorLiteral(embedding);
  const rows =
    scope.ids === undefined
      ? await db.execute<{ slug: string; distance: string | number }>(sql`
          select slug, (thumbnail_embedding <=> ${literal}::extensions.vector) as distance
          from videos
          where thumbnail_embedding is not null
            and (${scope.unlisted === undefined} or unlisted = ${scope.unlisted ?? false})
            and (${scope.topic === undefined} or topic is not distinct from ${scope.topic ?? null})
            and (${scope.source === undefined} or source = ${scope.source ?? ""})
            and (${scope.genre === undefined} or genre = ${scope.genre ?? ""})
            and (${scope.channel === undefined} or channel_name = ${scope.channel ?? ""})
            and (${scope.subscribed === undefined} or subscribed = ${scope.subscribed ?? false})
            and (${scope.newRelease === undefined} or new_release = ${scope.newRelease ?? false})
            and (${scope.spoilerFree === undefined} or spoiler_free = ${scope.spoilerFree ?? false})
            and (${scope.topRated === undefined} or top_rated = ${scope.topRated ?? false})
          order by thumbnail_embedding <=> ${literal}::extensions.vector
          limit 24
        `)
      : await db.execute<{ slug: string; distance: string | number }>(sql`
          with candidates as materialized (
            select slug, thumbnail_embedding
            from videos
            where thumbnail_embedding is not null
              and slug = any(${scope.ids})
          )
          select slug, (thumbnail_embedding <=> ${literal}::extensions.vector) as distance
          from candidates
          order by distance
          limit 24
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
