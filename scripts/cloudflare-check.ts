import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkImages, checkStream } from "../lib/cloudflare";

function loadEnv(text: string) {
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[name]) process.env[name] = value;
  }
}

function report(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+\S+/g, "Bearer ***");
}

async function main() {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_STREAM_API_TOKEN) {
    try {
      loadEnv(await readFile(path.join(process.cwd(), ".env"), "utf8"));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code !== "ENOENT") throw error;
    }
  }

  try {
    await checkStream();
    console.log("Stream: allowed");
  } catch (error) {
    console.log(`Stream: ${report(error)}`);
  }

  try {
    await checkImages();
    console.log("Images: allowed");
  } catch (error) {
    const message = report(error);
    const hint = message.includes("403")
      ? " The token needs Cloudflare Images: Edit as well as Stream: Edit."
      : "";
    console.log(`Images: ${message}.${hint}`);
  }
}

main().catch((error: unknown) => {
  console.error(report(error));
  process.exit(1);
});
