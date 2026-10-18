import os from "node:os";
import path from "node:path";

export const CLIP_MODEL = "Xenova/clip-vit-base-patch32";

// Node's default device is CPU, and CPU's default dtype is fp32. Pin both so
// clip:setup and the visual tests request the same onnx files.
export const CLIP_DEVICE = "cpu" as const;
export const CLIP_DTYPE = "fp32" as const;

const ONNX_SUFFIX = {
  fp32: "",
  q8: "_quantized",
} as const;

export function clipCacheDirectory() {
  return process.env.CLIP_CACHE_DIR || path.join(os.tmpdir(), "cinematube-clip");
}

export function clipOnnxFiles() {
  const suffix = ONNX_SUFFIX[CLIP_DTYPE];
  return [
    `${CLIP_MODEL}/onnx/text_model${suffix}.onnx`,
    `${CLIP_MODEL}/onnx/vision_model${suffix}.onnx`,
  ];
}
