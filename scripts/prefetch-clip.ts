import { preloadClip } from "./clip-embedding";

preloadClip()
  .then(() => {
    console.log("CLIP model is cached.");
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
