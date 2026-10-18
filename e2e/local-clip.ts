import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import {
  blockedModelHosts,
  hostnameOf,
  installModelHostGuard,
  isModelHost,
  resetBlockedModelHosts,
} from "../lib/model-host-guard";
import { CLIP_DEVICE, CLIP_DTYPE, CLIP_MODEL, clipCacheDirectory, clipOnnxFiles } from "../scripts/clip-runtime";

/**
 * Local stand-in for Midscene's `aiAssert`.
 *
 * Screenshots are embedded with the cached Xenova/clip-vit-base-patch32 model
 * (512-d, L2-normalized) at the same cpu/fp32 files `npm run clip:setup` uses.
 * Remote model hosts are refused in this process, in the browser, and in an
 * app server started with VISUAL_TEST_GUARD=1. A missing cache fails the test.
 *
 * Visual delta is `1 - cosine similarity` of those embeddings. 0 means the
 * two pictures have the same embedding; a larger score means they diverged.
 */

export { CLIP_MODEL };

const CLIP_DIMENSIONS = 512;

// A homepage match measured 0.3128. This floor stays under that score and still
// fails a page that only barely beats an unrelated photograph.
const MIN_LAYOUT_SIMILARITY = 0.27;

const UNRELATED_SCENE =
  "a close-up underwater photograph of a coral reef and tropical fish with no text and no screens";

const REQUIRED_FILES = [
  `${CLIP_MODEL}/config.json`,
  `${CLIP_MODEL}/preprocessor_config.json`,
  `${CLIP_MODEL}/tokenizer.json`,
  `${CLIP_MODEL}/tokenizer_config.json`,
  ...clipOnnxFiles(),
];

type Embedding = number[];

type ClipRuntime = {
  embedImage(png: Buffer): Promise<Embedding>;
  embedText(description: string): Promise<Embedding>;
};

let runtimePromise: Promise<ClipRuntime> | undefined;

const browserBlocked = new WeakMap<Page, string[]>();
const serverBaseline = new WeakMap<Page, number>();

installModelHostGuard();

export function blockedModelRequestCount() {
  return blockedModelHosts().length;
}

function resolveClipCache() {
  const repoCache = path.resolve(process.cwd(), "scripts/.clip-cache");
  const candidates = process.env.CLIP_CACHE_DIR ? [process.env.CLIP_CACHE_DIR] : [clipCacheDirectory(), repoCache];
  for (const dir of candidates) {
    const missing = REQUIRED_FILES.filter((file) => !fs.existsSync(path.join(dir, file)));
    if (missing.length === 0) return dir;
  }
  const onnx = clipOnnxFiles().join(" and ");
  throw new Error(
    `Local CLIP cache for ${CLIP_MODEL} (${CLIP_DEVICE}/${CLIP_DTYPE}) is incomplete. Looked in: ${candidates.join(", ")}. Expected ${onnx}. clip:setup writes ${clipCacheDirectory()} unless CLIP_CACHE_DIR is set. Refusing to download model files.`,
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
    installModelHostGuard();
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
    const localFiles = { local_files_only: true as const };
    const localModel = { ...localFiles, device: CLIP_DEVICE, dtype: CLIP_DTYPE };
    const [processor, visionModel, tokenizer, textModel] = await Promise.all([
      AutoProcessor.from_pretrained(CLIP_MODEL, localFiles),
      CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL, localModel),
      AutoTokenizer.from_pretrained(CLIP_MODEL, localFiles),
      CLIPTextModelWithProjection.from_pretrained(CLIP_MODEL, localModel),
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
    console.log(`CLIP dtype: ${CLIP_DEVICE}/${CLIP_DTYPE}`);
    console.log("CLIP remote models: disabled");
    return { embedImage, embedText };
  })();
  return runtimePromise;
}

export async function watchBrowserModelRequests(page: Page) {
  resetBlockedModelHosts();
  const seen: string[] = [];
  browserBlocked.set(page, seen);
  await page.route("**/*", async (route) => {
    const hostname = hostnameOf(route.request().url());
    if (isModelHost(hostname)) {
      seen.push(hostname);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  const response = await page.request.get("/api/model-host-guard");
  if (response.status() !== 200) {
    throw new Error("The app server is not blocking model hosts. Start it with VISUAL_TEST_GUARD=1.");
  }
  const body = (await response.json()) as { blocked?: number };
  serverBaseline.set(page, body.blocked ?? 0);
}

export async function modelRequestLeak(page: Page) {
  const response = await page.request.get("/api/model-host-guard");
  if (response.status() !== 200) {
    return "The app server is not blocking model hosts. Start it with VISUAL_TEST_GUARD=1.";
  }
  const body = (await response.json()) as { blocked?: number };
  const serverBlocked = (body.blocked ?? 0) - (serverBaseline.get(page) ?? 0);
  const browser = browserBlocked.get(page) ?? [];
  const worker = blockedModelRequestCount();
  if (serverBlocked === 0 && browser.length === 0 && worker === 0) return null;
  return `Model hosts were contacted (browser ${browser.length}, worker ${worker}, server ${serverBlocked}).`;
}

export async function createLocalClipAgent(page: Page) {
  const clip = await loadClip();

  return {
    async aiAssert(description: string) {
      const png = await page.screenshot({ type: "png", caret: "hide" });
      const image = await clip.embedImage(png);
      const similarity = dot(image, await clip.embedText(description));
      const unrelated = dot(image, await clip.embedText(UNRELATED_SCENE));
      if (!(similarity >= MIN_LAYOUT_SIMILARITY && similarity > unrelated)) {
        throw new Error(
          `Expected the page to show ${JSON.stringify(description)}. CLIP similarity ${similarity.toFixed(4)} must be at least ${MIN_LAYOUT_SIMILARITY.toFixed(4)} and above the unrelated scene (${unrelated.toFixed(4)}).`,
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
