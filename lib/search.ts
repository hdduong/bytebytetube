"use server";

import { sql } from "drizzle-orm";
import { clipTextEmbedding, vectorLiteral } from "../scripts/clip-embedding";
import { db } from "./db";
import type { SearchScope } from "./similarity";

const CACHE_LIMIT = 64;
const CACHE_TTL_MS = 60_000;
const searchCache = new Map<string, { at: number; value: { slug: string; distance: number }[] }>();
const inflight = new Map<string, Promise<{ slug: string; distance: number }[]>>();
let searchesInFlight = 0;
const waiters: Array<() => void> = [];

function remember(key: string, value: { slug: string; distance: number }[]) {
  const now = Date.now();
  for (const [cachedKey, entry] of searchCache) {
    if (now - entry.at >= CACHE_TTL_MS) searchCache.delete(cachedKey);
  }
  searchCache.delete(key);
  searchCache.set(key, { at: now, value });
  while (searchCache.size > CACHE_LIMIT) {
    const oldest = searchCache.keys().next().value;
    if (oldest === undefined) break;
    searchCache.delete(oldest);
  }
}

function readCache(key: string) {
  const cached = searchCache.get(key);
  if (!cached || Date.now() - cached.at >= CACHE_TTL_MS) {
    if (cached) searchCache.delete(key);
    return null;
  }
  searchCache.delete(key);
  searchCache.set(key, cached);
  return cached.value;
}

function acquire() {
  if (searchesInFlight < 2) {
    searchesInFlight += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waiters.push(() => {
      searchesInFlight += 1;
      resolve();
    });
  });
}

function release() {
  searchesInFlight -= 1;
  const next = waiters.shift();
  if (next) next();
}

function isDefaultCatalog(scope: SearchScope) {
  return (
    scope.unlisted === false &&
    scope.topic === null &&
    scope.ids === undefined &&
    scope.channel === undefined &&
    scope.genre === undefined &&
    scope.source === undefined &&
    scope.subscribed === undefined &&
    scope.newRelease === undefined &&
    scope.spoilerFree === undefined &&
    scope.topRated === undefined
  );
}

function hasFilter(scope: SearchScope) {
  return Object.values(scope).some((value) => value !== undefined);
}

export async function searchCatalog(query: string, scope: SearchScope = {}) {
  const cacheKey = `${query.trim().toLowerCase()}\n${JSON.stringify(scope)}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const job = (async () => {
    try {
      const value = await runSearch(query, scope);
      remember(cacheKey, value);
      return value;
    } finally {
      inflight.delete(cacheKey);
    }
  })();
  inflight.set(cacheKey, job);
  return job;
}

async function runSearch(query: string, scope: SearchScope) {
  await acquire();
  try {
    const embedding = await clipTextEmbedding(query);
    if (!embedding) return [];
    const literal = vectorLiteral(embedding);
    const rows = isDefaultCatalog(scope)
      ? await db.execute<{ slug: string; distance: string | number }>(sql`
          select slug, (thumbnail_embedding <=> ${literal}::extensions.vector) as distance
          from videos
          where thumbnail_embedding is not null
            and unlisted = false
            and topic is null
          order by thumbnail_embedding <=> ${literal}::extensions.vector
          limit 24
        `)
      : hasFilter(scope)
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
    return [...rows].map((row) => ({
      slug: String(row.slug),
      distance: Number(row.distance),
    }));
  } finally {
    release();
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
