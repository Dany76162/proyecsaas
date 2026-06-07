import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import path from "node:path";

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    experimental: {
      middlewareClientMaxBodySize: "512mb",
    },
    outputFileTracingRoot: path.resolve(__dirname, "../.."),
    // Use default .next for production (Railway compatibility).
    // Dev uses .next-dev to keep artifacts separate from production build.
    distDir: isDev ? ".next-dev" : ".next",
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "res.cloudinary.com",
        },
      ],
    },
  };
}
