import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "imagedelivery.net" },
      { protocol: "https", hostname: "**.cloudflarestream.com" },
    ],
  },
};

export default nextConfig;
