"use server";

import { sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { videosBySlugs } from "./library";
import {
  chooseFromTop,
  exclusionLadder,
  neighborLimit,
  parseShortsRequest,
  pickFromNeighbors,
  SLUG_LIMIT,
  validSlug,
  type ShortsRequest,
} from "./shorts-plan";
import type { Video } from "./videos";

type ShortsPage =
  | { status: "ok"; videos: Video[]; complete: boolean }
  | { status: "empty" }
  | { status: "error" };

function excluded(exclude: string[]): SQL {
  return sql`slug not in (${sql.join(
    exclude.map((value) => sql`${value}`),
    sql`, `,
  )})`;
}

function shortFilter(exclude: string[], anchor: string | null, embeddedOnly: boolean) {
  const exclusion = exclude.length === 0 ? sql`true` : excluded(exclude);
  return sql`
    source = 'short'
    and char_length(slug) <= ${SLUG_LIMIT}
    and (${anchor === null} or slug <> ${anchor ?? ""})
    and (${embeddedOnly} = false or thumbnail_embedding is not null)
    and ${exclusion}
  `;
}

function seekKey() {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let value = "";
  for (let index = 0; index < 12; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)] ?? "a";
  }
  return value;
}

async function randomShorts(exclude: string[], anchor: string | null, limit: number, embeddedOnly: boolean) {
  const start = seekKey();
  const rows = await db.execute<{ slug: string }>(sql`
    select slug from (
      (
        select slug
        from videos
        where ${shortFilter(exclude, anchor, embeddedOnly)}
          and slug >= ${start}
        order by slug
        limit ${limit}
      )
      union all
      (
        select slug
        from videos
        where ${shortFilter(exclude, anchor, embeddedOnly)}
          and slug < ${start}
        order by slug
        limit ${limit}
      )
    ) wrapped
    limit ${limit}
  `);
  return [...rows].map((row) => String(row.slug)).filter((slug) => validSlug(slug));
}

async function nearestShorts(anchor: string, limit: number) {
  const rows = await db.execute<{ slug: string }>(sql`
    select slug
    from videos
    where source = 'short'
      and thumbnail_embedding is not null
      and char_length(slug) <= ${SLUG_LIMIT}
      and slug <> ${anchor}
    order by thumbnail_embedding <=> (
      select thumbnail_embedding from videos where slug = ${anchor} and source = 'short'
    )
    limit ${limit}
  `);
  return [...rows].map((row) => String(row.slug)).filter((slug) => validSlug(slug));
}

async function shortVector(slug: string) {
  const rows = await db.execute<{ ready: boolean }>(sql`
    select thumbnail_embedding is not null as ready
    from videos
    where slug = ${slug} and source = 'short'
    limit 1
  `);
  const row = [...rows][0];
  if (!row) return "missing" as const;
  return row.ready ? ("embedded" as const) : ("plain" as const);
}

async function pickStart(exclude: string[]) {
  for (const step of exclusionLadder(exclude)) {
    const embedded = await randomShorts(step, null, 1, true);
    if (embedded[0]) return embedded[0];
    const any = await randomShorts(step, null, 1, false);
    if (any[0]) return any[0];
  }
  return null;
}

async function pickNeighbor(anchor: string, exclude: string[], count: number) {
  const vector = await shortVector(anchor);
  if (vector === "missing") return null;
  if (vector === "embedded") {
    const ordered = await nearestShorts(anchor, Math.min(200, count + exclude.length));
    const pick = pickFromNeighbors(ordered, exclude, count, Math.random);
    if (pick) return pick;
  }
  for (const step of exclusionLadder(exclude)) {
    const pool = await randomShorts(step, anchor, count, false);
    const pick = chooseFromTop(pool, Math.random);
    if (pick) return pick;
  }
  return null;
}

async function chooseBatch(request: ShortsRequest) {
  const count = neighborLimit();
  const chosen: string[] = [];
  let anchor = request.anchor ?? null;
  for (let index = 0; index < request.count; index += 1) {
    const exclude = [...request.exclude, ...chosen];
    const next = anchor ? await pickNeighbor(anchor, exclude, count) : await pickStart(exclude);
    if (!next) break;
    chosen.push(next);
    anchor = next;
  }
  return chosen;
}

export async function nextShorts(input?: unknown): Promise<ShortsPage> {
  const request = parseShortsRequest(input);
  if (!request) return { status: "error" };
  try {
    const anchorKnown = !request.anchor || (await shortVector(request.anchor)) !== "missing";
    const slugs = await chooseBatch(
      anchorKnown ? request : { exclude: request.exclude, count: request.count },
    );
    if (!request.anchor && slugs.length === 0) return { status: "empty" };
    if (!anchorKnown && slugs.length === 0) return { status: "empty" };
    return {
      status: "ok",
      videos: await videosBySlugs(slugs),
      complete: slugs.length < request.count,
    };
  } catch {
    return { status: "error" };
  }
}
