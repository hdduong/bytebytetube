import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadEnv() {
  try {
    const text = await readFile(path.join(process.cwd(), ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
      const index = line.indexOf("=");
      const name = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
      if (!process.env[name]) process.env[name] = value;
    }
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code !== "ENOENT") throw error;
  }
}

loadEnv()
  .then(async () => {
    const { preloadClip } = await import("./clip-embedding");
    await preloadClip();
    console.log("CLIP model is cached.");
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
