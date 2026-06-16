/**
 * remotion/index.tsx
 * KXD Creative Engine — Phase 5B
 *
 * TRUE Remotion entry point.
 *
 * Rules for this file (enforced by @remotion/bundler):
 *   1. MUST call registerRoot() — Remotion looks for this call when bundling.
 *   2. MUST NOT import any Next.js-specific modules (next/*, @payloadcms/*).
 *   3. MUST import React explicitly — Remotion's webpack does NOT guarantee
 *      the new JSX transform is configured.
 *
 * Root cause of "this file does not contain registerRoot()":
 *   The original implementation exported RemotionRoot but forgot to call
 *   registerRoot(RemotionRoot). Remotion's bundler performs a static check
 *   for that call and fails hard if it is absent.
 */

import React from "react";
import { Composition, registerRoot } from "remotion";
import {
  KxdReelComposition,
  calculateMetadata,
  type KxdReelProps,
} from "./KxdReelComposition";

// ── Default props (used by Remotion Studio preview) ───────────────────────────

const DEFAULT_PROPS: KxdReelProps = {
  reelTitle:   "Website Showcase Reel",
  clientName:  "KXD Client",
  websiteUrl:  "https://example.com",
  hook:        "Built for precision.",
  scenes: [
    {
      number:         1,
      title:          "Hero",
      durationFrames: 120,
      screenshotUrl:  null,
      onScreenText:   "Above the fold.",
      transition:     "Cut",
      screenshotRef:  "hero",
    },
    {
      number:         2,
      title:          "Services",
      durationFrames: 120,
      screenshotUrl:  null,
      onScreenText:   "What we do.",
      transition:     "Cut",
      screenshotRef:  "services",
    },
  ],
  ctaText:     "Book a discovery call.",
  platform:    "instagram-reel",
  visualStyle: "cinematic",
  aspectRatio: "9:16",
  fps:         30,
  titleFrames: 50,
  hookFrames:  55,
  ctaFrames:   75,
  outroFrames: 20,
};

// ── Root component — registered with Remotion ─────────────────────────────────

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="KxdReel"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={KxdReelComposition as any}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEFAULT_PROPS}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calculateMetadata={calculateMetadata as any}
    />
  );
};

// ── REQUIRED: register with Remotion's bundler ────────────────────────────────
// This call must exist in the entry point file. Without it, `@remotion/bundler`
// throws: "this file does not contain registerRoot()".

registerRoot(RemotionRoot);
