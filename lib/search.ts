"use server";

import { sql } from "drizzle-orm";
import { clipTextEmbedding, vectorLiteral } from "../scripts/clip-embedding";
import { db } from "./db";
import type { SearchScope } from "./similarity";

const searchCache = new Map<string, { at: number; value: { slug: string; distance: number }[] }>();
let searchesInFlight = 0;

function selective(scope: SearchScope) {
  return (
    scope.ids !== undefined ||
    scope.channel !== undefined ||
    scope.genre !== undefined ||
    scope.source !== undefined ||
    scope.topic !== undefined ||
    scope.unlisted !== undefined ||
    scope.subscribed !== undefined ||
    scope.newRelease !== undefined ||
    scope.spoilerFree !== undefined ||
    scope.topRated !== undefined
  );
}

export async function searchCatalog(query: string, scope: SearchScope = {}) {
  const cacheKey = `${query.trim().toLowerCase()}\n${JSON.stringify(scope)}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  if (searchesInFlight >= 2) throw new Error("Search is busy");
  searchesInFlight += 1;
  try {
    const embedding = await clipTextEmbedding(query);
    if (!embedding) return [];
    const literal = vectorLiteral(embedding);
    const rows = selective(scope)
      ? await db.execute<{ slug: string; distance: string | number }>(sql`
          with candidates as materialized (
            select slug, thumbnail_embedding
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
              and (${scope.ids === undefined} or slug = any(${scope.ids ?? []}))
          )
          select slug, (thumbnail_embedding <=> ${literal}::extensions.vector) as distance
          from candidates
          order by distance
          limit 24
        `)
      : await db.execute<{ slug: string; distance: string | number }>(sql`
          select slug, (thumbnail_embedding <=> ${literal}::extensions.vector) as distance
          from videos
          where thumbnail_embedding is not null
          order by thumbnail_embedding <=> ${literal}::extensions.vector
          limit 24
        `);
    const value = [...rows].map((row) => ({
      slug: String(row.slug),
      distance: Number(row.distance),
    }));
    searchCache.set(cacheKey, { at: Date.now(), value });
    return value;
  } finally {
    searchesInFlight -= 1;
  }
}

export async function relatedByThumbnail(slug: string, filter: "all" | "same" | "channel") {
  const rows = await db.execute<{ slug: string }>(sql`
    with candidates as materialized (
      select other.slug, other.thumbnail_embedding, current.thumbnail_embedding as target
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
    )
    select slug
    from candidates
    order by thumbnail_embedding <=> target
    limit 12
  `);
  return [...rows].map((row) => String(row.slug));
}
