import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    // Use default .next for production (Railway compatibility).
    // Dev uses .next-dev to keep artifacts separate from production build.
    distDir: isDev ? ".next-dev" : ".next",
  };
}
