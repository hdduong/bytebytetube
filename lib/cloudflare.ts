import { createHash } from "node:crypto";
  success?: boolean;
  errors?: { message?: string }[];
  result?: T;
};

export class CloudflareError extends Error {
  status: number;

  constructor(status: number, detail: string) {
    super(`Cloudflare ${status}${detail ? `: ${detail}` : ""}`);
    this.status = status;
  }
}

export function cloudflareConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim();
  if (!accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID is not set");
  if (!token) throw new Error("CLOUDFLARE_STREAM_API_TOKEN is not set");
  return { accountId, token };
}

export async function cloudflare<T>(path: string, init: RequestInit = {}) {
  const { accountId, token } = cloudflareConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
    ...init,
    headers,
  });
  const body = (await response.json()) as CloudflareBody<T>;
  if (!response.ok || body.success === false) {
    const detail = body.errors?.map((error) => error.message).filter(Boolean).join("; ") ?? "";
    throw new CloudflareError(response.status, detail);
  }
  return body;
}

export function checkStream() {
  return cloudflare<unknown>("/stream?limit=1");
}

export function checkImages() {
  return cloudflare<unknown>("/images/v1?per_page=1");
}

type HostedImage = { id?: string; variants?: string[] };
type StreamVideo = { uid?: string; playback?: { hls?: string } };

export function imageIdFor(localPath: string) {
  const normalized = localPath.replace(/^\//, "").replace(/\.[a-z0-9]+$/i, "").replace(/[^A-Za-z0-9_-]/g, "-");
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  const prefix = normalized.slice(0, 80 - "cinematube-".length - 1 - hash.length);
  return `cinematube-${prefix}-${hash}`;
}

function deliveryUrl(image: HostedImage | undefined) {
  const url = image?.variants?.[0];
  if (!url) throw new Error("Cloudflare Images returned no delivery URL");
  return url;
}

export async function uploadImage(bytes: Uint8Array, filename: string, id: string) {
  const body = new FormData();
  body.append("file", new Blob([bytes as BlobPart]), filename);
  body.append("id", id);
  try {
    const uploaded = await cloudflare<HostedImage>("/images/v1", { method: "POST", body });
    return deliveryUrl(uploaded.result);
  } catch (error) {
    if (!(error instanceof CloudflareError) || error.status !== 409) throw error;
    const existing = await cloudflare<HostedImage>(`/images/v1/${encodeURIComponent(id)}`);
    return deliveryUrl(existing.result);
  }
}

export async function uploadVideo(bytes: Uint8Array, filename: string, name: string) {
  const body = new FormData();
  body.append("file", new Blob([bytes as BlobPart], { type: "video/mp4" }), filename);
  body.append("meta", JSON.stringify({ name }));
  const uploaded = await cloudflare<StreamVideo>("/stream", { method: "POST", body });
  const hls = uploaded.result?.playback?.hls;
  if (!hls) throw new Error("Cloudflare Stream returned no playback URL");
  return hls;
}
