export const CLIP_DIMENSIONS = 512;

export function parseEmbedding(value: unknown): number[] | null {
  if (Array.isArray(value) && value.length === CLIP_DIMENSIONS && value.every((item) => typeof item === "number")) {
    return value.every((item) => Number.isFinite(item)) ? value : null;
  }
  if (typeof value !== "string" || value.length === 0) return null;
  const numbers = value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  if (numbers.length !== CLIP_DIMENSIONS || numbers.some((item) => !Number.isFinite(item))) return null;
  return numbers;
}

/** Average valid embeddings and L2-normalize. Missing or zero-length results have no taste vector. */
export function averageEmbeddings(vectors: unknown[]): number[] | null {
  const usable = vectors.map(parseEmbedding).filter((vector): vector is number[] => vector !== null);
  if (usable.length === 0) return null;
  const sum = new Array<number>(CLIP_DIMENSIONS).fill(0);
  for (const vector of usable) {
    for (let index = 0; index < CLIP_DIMENSIONS; index += 1) sum[index] += vector[index] ?? 0;
  }
  let norm = 0;
  for (let index = 0; index < CLIP_DIMENSIONS; index += 1) {
    sum[index] /= usable.length;
    norm += sum[index] * sum[index];
  }
  if (norm === 0) return null;
  const scale = Math.sqrt(norm);
  return sum.map((value) => value / scale);
}

export function vectorLiteral(values: number[]) {
  if (values.length !== CLIP_DIMENSIONS || values.some((value) => !Number.isFinite(value))) return null;
  return `[${values.join(",")}]`;
}

export function rankNearest(items: { id: string; distance: number }[], liked: Set<string>, limit = 8) {
  return items
    .filter((item) => !liked.has(item.id) && Number.isFinite(item.distance))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit)
    .map((item) => item.id);
}

export function validSlug(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 120 && !value.includes("\0");
}
