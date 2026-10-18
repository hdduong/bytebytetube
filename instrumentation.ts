export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.VISUAL_TEST_GUARD === "1") {
    const { installModelHostGuard } = await import("./lib/model-host-guard");
    installModelHostGuard();
  }
  // register() has to finish before a request is served. Preloading CLIP here
  // imports the native ONNX runtime and downloads a large model, and any
  // failure turns every page into a 500. Search loads the text model on demand.
  if (process.env.VERCEL) return;
  const { preloadClipText } = await import("./scripts/clip-embedding");
  await preloadClipText();
}
