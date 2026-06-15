/**
 * lib/reel-renderer.ts
 * KXD Creative Engine — Phase 5B
 *
 * Orchestrates Remotion bundle + render for website showcase reels.
 *
 * Pipeline:
 *   1. Parse scene sequence text from PromoVideoRequests
 *   2. Map screenshot refs → actual Media URLs from the captured screenshots
 *   3. Build KxdReelProps from PromoVideoRequest data
 *   4. Bundle the Remotion composition (cached after first call)
 *   5. renderMedia() → MP4 to public/generated-reels/
 *   6. Return the served path
 *
 * Local dev:   Works with no timeout — output at /generated-reels/filename.mp4
 * Vercel prod: Will timeout on Hobby (60s) / Pro (300s) for longer reels.
 *              Phase 5C: Remotion Lambda or background worker queue.
 *
 * Bundle caching:
 *   The webpack bundle step (10–20s) is cached in module scope after the first
 *   render. Subsequent renders on the same server instance reuse the bundle.
 */

import path     from "path";
import fs       from "fs";
import os       from "os";
import { createHash } from "crypto";
import type { KxdReelProps, RenderScene } from "../remotion/KxdReelComposition";

// ── Module-level bundle cache ─────────────────────────────────────────────────

let cachedBundleUrl: string | null = null;

/**
 * Returns the Remotion webpack bundle URL, creating and caching it on first call.
 *
 * Problem: Webpack reserves "!" for its loader-separator syntax
 * (e.g. "style-loader!css-loader!./file"). When the project lives under a path
 * that contains "!" (e.g. /Users/kxd/Desktop/!WORKSPACE/…), webpack rejects the
 * context derived from that path and throws immediately — before any compilation.
 *
 * Solution: copy the two Remotion source files (index.tsx + KxdReelComposition.tsx)
 * to a stable temp directory whose absolute path is guaranteed to be free of "!".
 * Pass that temp path as the bundle entry point. Override webpack's resolve.modules
 * so npm packages (react, remotion, …) are resolved from the project's own
 * node_modules, which webpack handles correctly once the context itself is clean.
 *
 * Paths without "!" use the standard entry point with no webpack override.
 */
async function getOrCreateBundle(): Promise<string> {
  if (cachedBundleUrl) return cachedBundleUrl;

  const { bundle } = await import("@remotion/bundler");
  const cwd = process.cwd();

  // ── Detect whether the project path is webpack-unsafe ──────────────────────
  const hasBang = cwd.includes("!");

  let entryPoint: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let webpackOverride: ((config: any) => any) | undefined;

  if (hasBang) {
    // Build a stable temp directory path that is guaranteed bang-free.
    // Using a hash of cwd keeps it consistent across restarts and avoids
    // accumulating many temp directories.
    const hash    = createHash("md5").update(cwd).digest("hex").slice(0, 8);
    const tmpDir  = path.join(os.tmpdir(), `kxd-reel-${hash}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    // Copy both Remotion source files to the temp directory.
    // — index.tsx imports only ./KxdReelComposition (relative, works in tmp)
    //   and npm packages (resolved via webpackOverride below).
    // — KxdReelComposition.tsx imports only react and remotion (npm packages).
    // Neither file imports anything else from the project tree.
    const remotionSrc = path.join(cwd, "remotion");
    for (const filename of ["index.tsx", "KxdReelComposition.tsx"]) {
      const src = path.join(remotionSrc, filename);
      const dst = path.join(tmpDir, filename);
      if (!fs.existsSync(src)) {
        throw new Error(
          `Remotion source file not found: ${src}. ` +
          `Ensure remotion/index.tsx and remotion/KxdReelComposition.tsx exist.`
        );
      }
      // Always re-copy so the bundle reflects any edits after a server restart.
      fs.copyFileSync(src, dst);
    }

    entryPoint = path.join(tmpDir, "index.tsx");

    // The temp directory has no node_modules. Tell webpack to also look in the
    // project's node_modules so react, remotion, etc. are found.
    // Webpack handles these resolved paths (which contain "!") just fine —
    // the restriction is only on the webpack context / entry point, not on
    // module file paths discovered during resolution.
    const projectNodeModules = path.join(cwd, "node_modules");
    webpackOverride = (config: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      ...config,
      resolve: {
        ...config.resolve,
        modules: [
          projectNodeModules,
          ...(Array.isArray(config.resolve?.modules)
            ? config.resolve.modules
            : ["node_modules"]),
        ],
      },
    });

    console.log(
      `[KXD Render] Project path contains "!" — bundling Remotion from safe tmp: ${tmpDir}`
    );
  } else {
    // Standard path: no "!" — use entry point in place.
    entryPoint = path.join(cwd, "remotion", "index.tsx");
  }

  if (!fs.existsSync(entryPoint)) {
    throw new Error(
      `Remotion entry not found at ${entryPoint}. Ensure remotion/index.tsx exists.`
    );
  }

  cachedBundleUrl = await bundle({
    entryPoint,
    ...(webpackOverride ? { webpackOverride } : {}),
  });

  return cachedBundleUrl;
}

// ── Scene sequence parser ─────────────────────────────────────────────────────

/**
 * Parse the text-format scene sequence produced by reelSceneSequenceToText().
 *
 * Expected block format (per scene, separated by ---):
 *   SCENE 1 · TITLE
 *   Time: 0:00–0:04 (4s)
 *   Source: hero
 *   On-Screen: "text here"
 *   VO: "optional vo"
 *   Visual: ...
 *   → Transition: Hard cut
 */
export function parseSceneSequenceText(text: string): ParsedScene[] {
  const blocks = text.split("---").map(b => b.trim()).filter(Boolean);

  return blocks.map((block, i) => {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

    const titleLine = lines.find(l => l.match(/^SCENE\s+\d+/i));
    const timeLine  = lines.find(l => l.startsWith("Time:"));
    const sourceLine= lines.find(l => l.startsWith("Source:"));
    const textLine  = lines.find(l => l.startsWith("On-Screen:"));
    const transLine = lines.find(l => l.startsWith("→ Transition:") || l.startsWith("Transition:"));

    const title    = titleLine
      ? titleLine.replace(/^SCENE\s+\d+\s*[·•]\s*/i, "").trim()
      : `Scene ${i + 1}`;

    const durationMatch = timeLine?.match(/\((\d+)s\)/);
    const durationSecs  = durationMatch ? parseInt(durationMatch[1], 10) : 4;

    const source = sourceLine
      ? sourceLine.replace(/^Source:\s*/i, "").trim()
      : "hero";

    const onScreenText = textLine
      ? textLine.replace(/^On-Screen:\s*/i, "").replace(/^"(.*)"$/, "$1").trim()
      : "";

    const transition = transLine
      ? transLine.replace(/^→\s*Transition:\s*/i, "").replace(/^Transition:\s*/i, "").trim()
      : "Hard cut";

    const numberMatch = titleLine?.match(/^SCENE\s+(\d+)/i);
    const number = numberMatch ? parseInt(numberMatch[1], 10) : i + 1;

    return { number, title, durationSecs, source, onScreenText, transition };
  });
}

export interface ParsedScene {
  number:       number;
  title:        string;
  durationSecs: number;
  source:       string;
  onScreenText: string;
  transition:   string;
}

// ── Screenshot URL resolver ───────────────────────────────────────────────────

const SECTION_ORDER: Record<string, number> = {
  hero:         0,
  services:     1,
  testimonials: 2,
  "cta-footer": 3,
  "full-brand": 4,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveScreenshotUrl(source: string, screenshots: any[], baseUrl: string): string | null {
  if (!screenshots || screenshots.length === 0) return null;

  // Try to match by the alt text section name
  const matchByAlt = screenshots.find((ss) => {
    const alt = String(ss.alt || "").toLowerCase();
    return alt.includes(source.replace("-", " "));
  });
  if (matchByAlt?.url) return absolutify(matchByAlt.url, baseUrl);

  // Fall back to order-based mapping
  const orderIdx = SECTION_ORDER[source];
  if (orderIdx !== undefined && screenshots[orderIdx]) {
    const ss = screenshots[orderIdx];
    if (ss.url) return absolutify(ss.url, baseUrl);
  }

  // Last resort: first screenshot
  const first = screenshots[0];
  return first?.url ? absolutify(first.url, baseUrl) : null;
}

function absolutify(url: string, baseUrl: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ── Duration mapping ──────────────────────────────────────────────────────────

function durationTargetToSeconds(target: string | null): number {
  const map: Record<string, number> = {
    "15s": 15, "30s": 30, "45s": 45, "60s": 60, "90s": 90,
  };
  return map[target || "30s"] || 30;
}

function aspectRatioValue(platform: string): KxdReelProps["aspectRatio"] {
  if (platform === "linkedin" || platform === "youtube") return "16:9";
  return "9:16";
}

// ── Build composition props ───────────────────────────────────────────────────

export interface BuildPropsInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc:     Record<string, any>;
  baseUrl: string;
  fps?:    number;
}

export function buildCompositionProps(input: BuildPropsInput): KxdReelProps {
  const { doc, baseUrl } = input;
  const fps = input.fps ?? 30;

  const totalSecs    = durationTargetToSeconds(doc.durationTarget as string | null);
  const aspectRatio  = aspectRatioValue(doc.platform as string || "");

  // Chrome-card fixed durations
  const titleFrames  = Math.round(fps * 1.8);
  const hookFrames   = Math.round(fps * 2.0);
  const ctaFrames    = Math.round(fps * 2.5);
  const outroFrames  = Math.round(fps * 0.7);
  const chromeFrames = titleFrames + hookFrames + ctaFrames + outroFrames;

  const screenshots: unknown[] = Array.isArray(doc.capturedScreenshots)
    ? doc.capturedScreenshots
    : [];

  // Parse scenes from sceneSequence text
  const rawText = String(doc.sceneSequence || "").trim();
  const parsed  = rawText ? parseSceneSequenceText(rawText) : [];

  let scenes: RenderScene[];

  if (parsed.length > 0) {
    // Use parsed scene durations, scaled proportionally if they exceed totalSecs
    const parsedTotalSecs  = parsed.reduce((s, p) => s + p.durationSecs, 0);
    const availableSecs    = totalSecs - (chromeFrames / fps);
    const scale            = parsedTotalSecs > availableSecs ? availableSecs / parsedTotalSecs : 1;

    scenes = parsed.map(p => ({
      number:         p.number,
      title:          p.title,
      durationFrames: Math.round(p.durationSecs * scale * fps),
      screenshotUrl:  resolveScreenshotUrl(p.source, screenshots as any[], baseUrl), // eslint-disable-line @typescript-eslint/no-explicit-any
      onScreenText:   p.onScreenText || p.title,
      transition:     p.transition,
      screenshotRef:  p.source,
    }));
  } else {
    // Fallback: generic scenes from screenshot list
    const sections = ["hero", "services", "testimonials", "cta-footer"];
    const availableFrames = Math.round(totalSecs * fps) - chromeFrames;
    const perScene = Math.floor(availableFrames / Math.max(sections.length, 1));

    scenes = sections.map((ref, i) => ({
      number:         i + 1,
      title:          ref.replace("-", " "),
      durationFrames: perScene,
      screenshotUrl:  resolveScreenshotUrl(ref, screenshots as any[], baseUrl), // eslint-disable-line @typescript-eslint/no-explicit-any
      onScreenText:   "",
      transition:     "Hard cut",
      screenshotRef:  ref,
    }));
  }

  // Ensure no zero-duration scenes
  scenes = scenes.filter(s => s.durationFrames > 0);

  const clientName = String(
    doc.clientName ||
    (typeof doc.client === "object" && doc.client !== null ? (doc.client as Record<string, unknown>).name : null) ||
    "KXD Client"
  );

  return {
    reelTitle:    String(doc.reelTitle || doc.videoTitle || "Website Showcase Reel"),
    clientName,
    websiteUrl:   String(doc.websiteUrl || ""),
    hook:         String(doc.reelHook || ""),
    scenes,
    ctaText:      String(doc.ctaText || doc.primaryCTA || "Book a discovery call."),
    platform:     String(doc.platform || "instagram-reel"),
    visualStyle:  String(doc.visualStyle || "cinematic"),
    aspectRatio,
    fps,
    titleFrames,
    hookFrames,
    ctaFrames,
    outroFrames,
  };
}

// ── Render pipeline ───────────────────────────────────────────────────────────

export interface RenderInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc:       Record<string, any>;
  requestId: number;
  version:   number;
  baseUrl:   string;
  fps?:      number;
}

export interface RenderResult {
  success:     boolean;
  outputPath:  string | null;
  servedUrl:   string | null;
  durationMs:  number;
  frameCount:  number;
  error?:      string;
}

export async function renderReelToMp4(input: RenderInput): Promise<RenderResult> {
  const startMs = Date.now();

  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  const props     = buildCompositionProps({ doc: input.doc, baseUrl: input.baseUrl, fps: input.fps });
  const frameCount = props.titleFrames + props.hookFrames +
    props.scenes.reduce((s, sc) => s + sc.durationFrames, 0) +
    props.ctaFrames + props.outroFrames;

  // Ensure output directory
  const outputDir = path.join(process.cwd(), "public", "generated-reels");
  fs.mkdirSync(outputDir, { recursive: true });

  const filename   = `kxd-reel-${input.requestId}-v${input.version}.mp4`;
  const outputPath = path.join(outputDir, filename);
  const servedUrl  = `/generated-reels/${filename}`;

  try {
    const bundleUrl = await getOrCreateBundle();

    const inputProps = props as unknown as Record<string, unknown>;

    const composition = await selectComposition({
      serveUrl:   bundleUrl,
      id:         "KxdReel",
      inputProps,
    });

    await renderMedia({
      composition,
      serveUrl:       bundleUrl,
      codec:          "h264",
      outputLocation: outputPath,
      inputProps,
      onProgress:     ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 10 === 0) {
          console.log(`[KXD Render] Request #${input.requestId} — ${pct}%`);
        }
      },
    });

    return {
      success:    true,
      outputPath,
      servedUrl,
      durationMs: Date.now() - startMs,
      frameCount,
    };
  } catch (err) {
    return {
      success:    false,
      outputPath: null,
      servedUrl:  null,
      durationMs: Date.now() - startMs,
      frameCount,
      error:      String(err),
    };
  }
}

// ── Render manifest (fallback — no full render) ────────────────────────────────

/**
 * Returns a JSON manifest of what would be rendered.
 * Used when Remotion is not available or for preview/debugging.
 */
export function buildRenderManifest(input: BuildPropsInput) {
  const props = buildCompositionProps(input);
  const totalFrames = props.titleFrames + props.hookFrames +
    props.scenes.reduce((s, sc) => s + sc.durationFrames, 0) +
    props.ctaFrames + props.outroFrames;

  return {
    compositionId:    "KxdReel",
    totalFrames,
    durationSeconds:  totalFrames / props.fps,
    fps:              props.fps,
    aspectRatio:      props.aspectRatio,
    props,
    renderCommand: `npx remotion render KxdReel --props='${JSON.stringify({ ...props, scenes: "[array]" })}' --output=./public/generated-reels/kxd-reel-${input.doc.id}.mp4`,
    notes: [
      "This manifest describes what would be rendered.",
      "Run the renderCommand above from the project root after running: npx remotion bundle remotion/index.tsx",
      "Production rendering: Phase 5C — Remotion Lambda or background worker queue.",
    ],
  };
}
