import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "scripts", ".cloudflare-playback.json");
const temporary = `${file}.tmp`;

function playbackMap(value: unknown) {
  const saved: Record<string, string> = Object.create(null);
  if (!value || typeof value !== "object" || Array.isArray(value)) return saved;
  for (const [slug, playback] of Object.entries(value)) {
    if (typeof playback === "string") saved[slug] = playback;
  }
  return saved;
}

export async function readSavedPlayback() {
  try {
    return playbackMap(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") return playbackMap(null);
    throw error;
  }
}

export async function writeSavedPlayback(value: Record<string, string>) {
  await writeFile(temporary, JSON.stringify(playbackMap(value), null, 2));
  await rename(temporary, file);
}
