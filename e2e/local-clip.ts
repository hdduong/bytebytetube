import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

/**
 * Local stand-in for Midscene's `aiAssert`.
 *
 * Screenshots are embedded with the cached Xenova/clip-vit-base-patch32 model
 * (512-d, L2-normalized), the same weights scripts/clip-embedding.ts uses.
 * Remote model hosts are refused. A missing cache fails the test.
 *
 * Visual delta is `1 - cosine similarity` of those embeddings. 0 means the
 * two pictures have the same embedding; a larger score means they diverged.
 */

export const CLIP_MODEL = "Xenova/clip-vit-base-patch32";
const CLIP_DIMENSIONS = 512;

const UNRELATED_SCENE =
  "a close-up underwater photograph of a coral reef and tropical fish with no text and no screens";

const REQUIRED_FILES = [
  "Xenova/clip-vit-base-patch32/config.json",
  "Xenova/clip-vit-base-patch32/preprocessor_config.json",
  "Xenova/clip-vit-base-patch32/tokenizer.json",
  "Xenova/clip-vit-base-patch32/tokenizer_config.json",
  "Xenova/clip-vit-base-patch32/onnx/text_model.onnx",
  "Xenova/clip-vit-base-patch32/onnx/vision_model.onnx",
];

const MODEL_HOSTS = ["huggingface.co", "hf.co", "openai.com", "fal.ai", "fal.run", "midscene.com"];

const blockedModelRequests: string[] = [];

type Embedding = number[];

type ClipRuntime = {
  embedImage(png: Buffer): Promise<Embedding>;
  embedText(description: string): Promise<Embedding>;
};

let runtimePromise: Promise<ClipRuntime> | undefined;
let guardInstalled = false;

export function blockedModelRequestCount() {
  return blockedModelRequests.length;
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isModelHost(hostname: string) {
  return MODEL_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function installModelNetworkGuard() {
  if (guardInstalled) return;
  guardInstalled = true;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    let hostname = "";
    try {
      hostname = new URL(url, "http://127.0.0.1").hostname;
    } catch {
      hostname = "";
    }
    if (isModelHost(hostname)) {
      blockedModelRequests.push(url);
      throw new Error(`Refusing network model request during local visual tests: ${url}`);
    }
    return original(input, init);
  };
}

function resolveClipCache() {
  const candidates = [process.env.CLIP_CACHE_DIR, path.resolve(process.cwd(), "scripts/.clip-cache")].filter(
    (value): value is string => Boolean(value),
  );
  for (const dir of candidates) {
    const missing = REQUIRED_FILES.filter((file) => !fs.existsSync(path.join(dir, file)));
    if (missing.length === 0) return dir;
  }
  throw new Error(
    `Local CLIP cache for ${CLIP_MODEL} is incomplete. Looked in: ${candidates.join(", ") || "(none)"}. Expected onnx/vision_model.onnx and onnx/text_model.onnx under scripts/.clip-cache or CLIP_CACHE_DIR. Refusing to download model files.`,
  );
}

function normalize(data: ArrayLike<number>) {
  if (data.length < CLIP_DIMENSIONS) {
    throw new Error(`CLIP returned ${data.length} values for ${CLIP_MODEL}`);
  }
  const values = data instanceof Float32Array ? data : Float32Array.from(data);
  const used = values.length === CLIP_DIMENSIONS ? values : values.subarray(0, CLIP_DIMENSIONS);
  let sum = 0;
  for (const value of used) sum += value * value;
  const scale = Math.sqrt(sum) || 1;
  return Array.from(used, (value) => value / scale);
}

function dot(left: Embedding, right: Embedding) {
  let sum = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) sum += left[index] * right[index];
  return Math.min(1, Math.max(-1, sum));
}

function loadClip() {
  runtimePromise ??= (async () => {
    installModelNetworkGuard();
    const cacheDir = resolveClipCache();
    const transformers = await import("@huggingface/transformers");
    const { env, AutoProcessor, AutoTokenizer, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, RawImage } =
      transformers;
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.useBrowserCache = false;
    env.useFSCache = true;
    env.cacheDir = cacheDir;
    env.fetch = globalThis.fetch;
    const localOnly = { local_files_only: true as const };
    const [processor, visionModel, tokenizer, textModel] = await Promise.all([
      AutoProcessor.from_pretrained(CLIP_MODEL, localOnly),
      CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL, localOnly),
      AutoTokenizer.from_pretrained(CLIP_MODEL, localOnly),
      CLIPTextModelWithProjection.from_pretrained(CLIP_MODEL, localOnly),
    ]);
    const textCache = new Map<string, Embedding>();

    async function embedImage(png: Buffer): Promise<Embedding> {
      const blob = new Blob([new Uint8Array(png)], { type: "image/png" });
      const image = await RawImage.read(blob);
      // CLIP center-crops to 224px. Fit the whole screenshot first so the
      // search field and the video grid both survive that crop.
      const fitted = image.width === 224 && image.height === 224 ? image : await image.resize(224, 224);
      const inputs = await processor(fitted);
      const { image_embeds: embeds } = await visionModel(inputs);
      return normalize(embeds.data);
    }

    async function embedText(description: string): Promise<Embedding> {
      const text = description.trim();
      const cached = textCache.get(text);
      if (cached) return cached;
      const inputs = await tokenizer([text], { padding: true, truncation: true });
      const { text_embeds: embeds } = await textModel(inputs);
      const embedding = normalize(embeds.data);
      textCache.set(text, embedding);
      return embedding;
    }

    console.log(`CLIP cache: ${cacheDir}`);
    console.log("CLIP remote models: disabled");
    return { embedImage, embedText };
  })();
  return runtimePromise;
}

export async function createLocalClipAgent(page: Page) {
  const clip = await loadClip();

  return {
    async aiAssert(description: string) {
      const png = await page.screenshot({ type: "png", caret: "hide" });
      const image = await clip.embedImage(png);
      const similarity = dot(image, await clip.embedText(description));
      const unrelated = dot(image, await clip.embedText(UNRELATED_SCENE));
      if (!(similarity > unrelated)) {
        throw new Error(
          `Expected the page to show ${JSON.stringify(description)}. CLIP similarity ${similarity.toFixed(4)} was not above the unrelated scene (${unrelated.toFixed(4)}).`,
        );
      }
      return similarity;
    },

    async visualDelta(before: Buffer, after: Buffer) {
      const left = await clip.embedImage(before);
      const right = await clip.embedImage(after);
      return 1 - dot(left, right);
    },
  };
}
