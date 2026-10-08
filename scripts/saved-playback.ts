import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "scripts", ".cloudflare-playback.json");

export async function readSavedPlayback() {
  try {
    return JSON.parse(await readFile(file, "utf8")) as Record<string, string>;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") return {};
    throw error;
  }
}

export async function writeSavedPlayback(value: Record<string, string>) {
  await writeFile(file, JSON.stringify(value, null, 2));
}
