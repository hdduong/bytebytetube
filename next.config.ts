import type { NextConfig } from "next";

// transformers.js loads onnxruntime-node through a helper require that Next's
// file tracer does not follow. The npm package also ships every platform's
// binaries (~287MB), which is over the serverless function size limit, so the
// trace keeps only the Linux x64 build Vercel runs.
const clipRuntimeFiles = [
  "./node_modules/onnxruntime-node/package.json",
  "./node_modules/onnxruntime-node/dist/**/*",
  "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*",
  "./node_modules/onnxruntime-common/**/*",
];

const otherClipBinaries = [
  "./node_modules/onnxruntime-node/bin/napi-v6/darwin/**/*",
  "./node_modules/onnxruntime-node/bin/napi-v6/win32/**/*",
  "./node_modules/onnxruntime-node/bin/napi-v6/linux/arm64/**/*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "@huggingface/transformers", "onnxruntime-node", "sharp"],
  outputFileTracingIncludes: {
    "/": clipRuntimeFiles,
    "/*": clipRuntimeFiles,
  },
  outputFileTracingExcludes: {
    "/": otherClipBinaries,
    "/*": otherClipBinaries,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "imagedelivery.net" },
      { protocol: "https", hostname: "**.cloudflarestream.com" },
    ],
  },
};

export default nextConfig;
