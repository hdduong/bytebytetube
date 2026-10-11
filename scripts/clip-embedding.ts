import os from "node:os";
import path from "node:path";
import { AutoProcessor, AutoTokenizer, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, env, RawImage } from "@huggingface/transformers";
import type postgres from "postgres";
import { CLIP_DIMENSIONS } from "../drizzle/schema";

export const CLIP_MODEL = "Xenova/clip-vit-base-patch32";

const publicRoot = path.resolve(process.cwd(), "public");

function configureClip() {
  env.cacheDir = process.env.CLIP_CACHE_DIR || path.join(os.tmpdir(), "cinematube-clip");
}

function allowedImageUrl(source: string) {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return false;
  }
  return url.protocol === "https:" && url.hostname === "imagedelivery.net";
}

let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | undefined;
let visionModel: Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>> | undefined;
let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | undefined;
let textModel: Awaited<ReturnType<typeof CLIPTextModelWithProjection.from_pretrained>> | undefined;

function fileInsidePublic(localPath: string) {
  const file = path.resolve(publicRoot, localPath.replace(/^[/\\]+/, ""));
  const relative = path.relative(publicRoot, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Refusing to read a thumbnail outside public");
  }
  return file;
}

function normalize(values: Float32Array) {
  let sum = 0;
  for (const value of values) sum += value * value;
  const scale = Math.sqrt(sum) || 1;
  return Array.from(values, (value) => value / scale);
}

let loadingVision: Promise<void> | undefined;

async function clip() {
  configureClip();
  if (!processor || !visionModel) {
    if (!loadingVision) {
      const attempt: { promise?: Promise<void> } = {};
      attempt.promise = (async () => {
        try {
          processor = await AutoProcessor.from_pretrained(CLIP_MODEL);
          visionModel = await CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL);
        } catch (error) {
          if (loadingVision === attempt.promise) loadingVision = undefined;
          throw error;
        }
      })();
      loadingVision = attempt.promise;
    }
    await loadingVision;
  }
  if (!processor || !visionModel) throw new Error("CLIP vision model did not load");
  return { processor, visionModel };
}

export async function clipImageEmbedding(source: string) {
  if (source.startsWith("https://") || source.startsWith("http://")) {
    if (!allowedImageUrl(source)) throw new Error("Refusing to fetch a thumbnail from that host");
  }
  const image = source.startsWith("https://") ? await RawImage.read(source) : await RawImage.read(fileInsidePublic(source));
  const { processor: imageProcessor, visionModel: model } = await clip();
  const inputs = await imageProcessor(image);
  const { image_embeds: embeds } = await model(inputs);
  const values = embeds.data;
  if (!(values instanceof Float32Array) || values.length !== CLIP_DIMENSIONS) {
    throw new Error(`CLIP returned ${values?.length ?? 0} values for ${CLIP_MODEL}`);
  }
  return normalize(values);
}

function embeddingValues(data: ArrayLike<number> | undefined) {
  if (!data || data.length < CLIP_DIMENSIONS) {
    throw new Error(`CLIP returned ${data?.length ?? 0} values for ${CLIP_MODEL}`);
  }
  const values = data instanceof Float32Array ? data : Float32Array.from(data);
  return normalize(values.length === CLIP_DIMENSIONS ? values : values.slice(0, CLIP_DIMENSIONS));
}

let loadingText: Promise<void> | undefined;

async function clipText() {
  configureClip();
  if (!tokenizer || !textModel) {
    if (!loadingText) {
      const attempt: { promise?: Promise<void> } = {};
      attempt.promise = (async () => {
        try {
          tokenizer = await AutoTokenizer.from_pretrained(CLIP_MODEL);
          textModel = await CLIPTextModelWithProjection.from_pretrained(CLIP_MODEL);
        } catch (error) {
          if (loadingText === attempt.promise) loadingText = undefined;
          throw error;
        }
      })();
      loadingText = attempt.promise;
    }
    await loadingText;
  }
  if (!tokenizer || !textModel) throw new Error("CLIP text model did not load");
  return { tokenizer, textModel };
}

export async function preloadClipText() {
  await clipText();
}

export async function preloadClip() {
  await Promise.all([clip(), clipText()]);
}

export async function clipTextEmbedding(query: string) {
  const text = query.trim();
  if (!text) return null;
  const { tokenizer: tokens, textModel: model } = await clipText();
  const inputs = await tokens([text], { padding: true, truncation: true });
  const { text_embeds: embeds } = await model(inputs);
  return embeddingValues(embeds.data);
}

export function vectorLiteral(values: number[]) {
  if (values.length !== CLIP_DIMENSIONS || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`CLIP embedding must be ${CLIP_DIMENSIONS} finite numbers`);
  }
  return `[${values.join(",")}]`;
}

export async function ensureVectorSchema(sql: postgres.Sql) {
  await sql`set default_transaction_read_only = off`;
  await sql.unsafe(`create extension if not exists vector with schema extensions`);
  await sql.unsafe(`alter table videos add column if not exists thumbnail_embedding extensions.vector(512)`);
  await sql.unsafe(
    `comment on column videos.thumbnail_embedding is 'L2-normalized CLIP ViT-B/32 image embedding from Xenova/clip-vit-base-patch32'`,
  );
  await sql.unsafe(
    `create index if not exists videos_thumbnail_embedding_idx on videos using hnsw (thumbnail_embedding extensions.vector_cosine_ops)`,
  );
  await sql.unsafe(
    `create index if not exists videos_visible_thumbnail_embedding_idx on videos using hnsw (thumbnail_embedding extensions.vector_cosine_ops) where unlisted = false and topic is null`,
  );
  await sql.unsafe(
    `create index if not exists videos_short_thumbnail_embedding_idx on videos using hnsw (thumbnail_embedding extensions.vector_cosine_ops) where source = 'short'`,
  );
  await sql.unsafe(`create index if not exists videos_short_slug_idx on videos (slug) where source = 'short'`);
}
