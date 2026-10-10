export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { preloadClip } = await import("./scripts/clip-embedding");
  await preloadClip();
}
