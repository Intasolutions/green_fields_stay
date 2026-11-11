import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

export default function config(phase: string): NextConfig {
  // NEXT_PUBLIC_API_BASE_URL is baked into the build. Without it the app
  // silently falls back to http://127.0.0.1:8000/api and every request from
  // a real browser fails, so refuse to produce such a build.
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.NEXT_PUBLIC_API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be set for a production build " +
        "(e.g. https://bookings.greenfieldstay.com/api).",
    );
  }

  return {};
}
