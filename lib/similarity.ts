export const relevanceMargin = 0.015;

export type ScoredSlug = { slug: string; distance: number };

export type SearchScope = {
  unlisted?: boolean;
  topic?: string | null;
  source?: string;
  genre?: string;
  channel?: string;
  subscribed?: boolean;
  newRelease?: boolean;
  spoilerFree?: boolean;
  topRated?: boolean;
  ids?: string[];
};

export function withinMargin<T extends { id: string }>(list: T[], scored: ScoredSlug[] | null) {
  if (!scored) return [];
  const distance = new Map(scored.map((item) => [item.slug, item.distance]));
  const matched = list.filter((item) => distance.has(item.id));
  if (matched.length === 0) return [];
  const best = Math.min(...matched.map((item) => distance.get(item.id) ?? Number.POSITIVE_INFINITY));
  return matched
    .filter((item) => (distance.get(item.id) ?? Number.POSITIVE_INFINITY) <= best + relevanceMargin)
    .sort((left, right) => (distance.get(left.id) ?? 0) - (distance.get(right.id) ?? 0));
}
