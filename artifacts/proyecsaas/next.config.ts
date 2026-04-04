import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    distDir: isDev ? ".next-dev" : ".next",
    // Standalone bundles everything needed to run without pnpm at runtime.
    // Only enabled for production so dev HMR is unaffected.
    ...(isDev ? {} : { output: "standalone" }),
  };
}
