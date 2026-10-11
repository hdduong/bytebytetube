const DEFAULT_NEIGHBORS = 10;
const DEFAULT_BATCH = 3;

export function validSlug(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 120 && !value.includes("\0");
}

export function neighborLimit(raw = process.env.SHORTS_NEIGHBORS): number {
  if (raw === undefined || raw === "") return DEFAULT_NEIGHBORS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 50) return DEFAULT_NEIGHBORS;
  return value;
}

export function orderedUnique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

/** At most three tries: every exclusion, then only the newer half, then none. */
export function exclusionLadder(exclude: string[]) {
  if (exclude.length === 0) return [[]];
  const newer = exclude.slice(Math.ceil(exclude.length / 2));
  const steps = [exclude];
  if (newer.length > 0 && newer.length < exclude.length) steps.push(newer);
  steps.push([]);
  return steps;
}

export function pickFromNeighbors(ordered: string[], exclude: string[], count: number, random: () => number) {
  for (const step of exclusionLadder(exclude)) {
    const blocked = new Set(step);
    const allowed = ordered.filter((slug) => !blocked.has(slug)).slice(0, count);
    const pick = chooseFromTop(allowed, random);
    if (pick) return pick;
  }
  return null;
}

export function chooseFromTop<T>(items: T[], random: () => number): T | null {
  if (items.length === 0) return null;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index] ?? null;
}

export function shortKey(slug: string, occurrence: number) {
  return `${slug}:${occurrence}`;
}

export type ShortsRequest = {
  anchor?: string;
  exclude: string[];
  count: number;
};

export function parseShortsRequest(input: unknown): ShortsRequest | null {
  if (input === undefined) return { exclude: [], count: DEFAULT_BATCH };
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as { anchor?: unknown; exclude?: unknown; count?: unknown };
  let anchor: string | undefined;
  if (record.anchor !== undefined && record.anchor !== null) {
    if (!validSlug(record.anchor)) return null;
    anchor = record.anchor;
  }
  let exclude: string[] = [];
  if (record.exclude !== undefined) {
    if (!Array.isArray(record.exclude) || record.exclude.length > 80) return null;
    if (!record.exclude.every((item) => validSlug(item))) return null;
    exclude = orderedUnique(record.exclude);
  }
  let count = DEFAULT_BATCH;
  if (record.count !== undefined) {
    if (typeof record.count !== "number" || !Number.isInteger(record.count) || record.count < 1 || record.count > 6) {
      return null;
    }
    count = record.count;
  }
  return { ...(anchor ? { anchor } : {}), exclude, count };
}
