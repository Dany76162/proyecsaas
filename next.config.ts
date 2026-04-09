import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isProductionPhase =
    phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER;

  return {
    reactStrictMode: true,
    // Keep dev and production artifacts separate so one mode cannot corrupt the other.
    distDir: isProductionPhase ? ".next-prod" : ".next-dev",
  };
}
