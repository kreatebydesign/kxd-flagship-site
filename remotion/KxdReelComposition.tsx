/**
 * remotion/KxdReelComposition.tsx
 * KXD Creative Engine — Phase 5B
 *
 * Premium website showcase reel composition.
 * Renders entirely from data: screenshots + storyboard + brand copy.
 *
 * Scene sequence:
 *   1. Title Card       — reel title on black, editorial serif
 *   2. Hook Card        — hook text, large italic serif, gold accent
 *   3. Screenshot Scenes— screenshot background + text overlay + Ken Burns
 *   4. CTA End Card     — CTA text on black, gold line accents
 *   5. Outro            — clean fade to black
 *
 * Design tokens (hardcoded — cannot use CSS vars in Remotion Chrome context):
 *   Background: #080808
 *   Gold: #C5A65C
 *   Cream: #f8f3ea
 *   Cream Muted: #bfb7aa
 *   Serif: Georgia, "Times New Roman", serif
 *   Sans: "Helvetica Neue", Arial, sans-serif
 *   Mono: "Courier New", monospace
 */

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from "remotion";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:        "#080808",
  bgPure:    "#000000",
  gold:      "#C5A65C",
  goldDim:   "rgba(197,166,92,0.55)",
  goldFaint: "rgba(197,166,92,0.12)",
  cream:     "#f8f3ea",
  muted:     "#bfb7aa",
  serif:     'Georgia, "Times New Roman", serif',
  sans:      '"Helvetica Neue", Arial, sans-serif',
  mono:      '"Courier New", monospace',
} as const;

// ── Scene types ───────────────────────────────────────────────────────────────

export interface RenderScene {
  number:        number;
  title:         string;
  durationFrames:number;
  screenshotUrl: string | null;
  onScreenText:  string;
  transition:    string;
  screenshotRef: string;
}

export interface KxdReelProps {
  reelTitle:      string;
  clientName:     string;
  websiteUrl:     string;
  hook:           string;
  scenes:         RenderScene[];
  ctaText:        string;
  platform:       string;
  visualStyle:    string;
  aspectRatio:    "9:16" | "1:1" | "16:9";
  fps:            number;
  titleFrames:    number;
  hookFrames:     number;
  ctaFrames:      number;
  outroFrames:    number;
}

// ── calculateMetadata — dynamic dimensions + duration ─────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculateMetadata = ({ props }: { props: any }) => {
  const p = props as KxdReelProps;
  const totalFrames =
    p.titleFrames +
    p.hookFrames +
    p.scenes.reduce((s: number, sc: RenderScene) => s + sc.durationFrames, 0) +
    p.ctaFrames +
    p.outroFrames;

  let width  = 1080;
  let height = 1920;
  if (p.aspectRatio === "16:9") { width = 1920; height = 1080; }
  if (p.aspectRatio === "1:1")  { width = 1080; height = 1080; }

  return { durationInFrames: totalFrames, fps: p.fps, width, height };
};

// ── Fade helper ───────────────────────────────────────────────────────────────

function useFade(fadeInFrames = 12, fadeOutFrames = 10): number {
  const frame            = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn  = interpolate(frame, [0, fadeInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - fadeOutFrames, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(fadeIn, fadeOut);
}

// ── Gold line ─────────────────────────────────────────────────────────────────

function GoldLine({ width = 64, style }: { width?: number; style?: React.CSSProperties }) {
  return <div style={{ width, height: 1, background: T.gold, ...style }} />;
}

// ── Scene: Title Card ─────────────────────────────────────────────────────────

function TitleCard({ reelTitle, clientName, websiteUrl }: { reelTitle: string; clientName: string; websiteUrl: string }) {
  const opacity = useFade(18, 14);
  const frame   = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const textSlide = interpolate(frame, [0, 24], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: T.bgPure, opacity }}>
      <div style={{
        position:       "absolute",
        inset:          0,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "0 10%",
        transform:      `translateY(${textSlide}px)`,
      }}>
        {/* Eyebrow: client name */}
        <p style={{
          fontFamily:    T.sans,
          fontSize:      22,
          fontWeight:    400,
          letterSpacing: "0.22em",
          textTransform: "uppercase" as const,
          color:         T.goldDim,
          marginBottom:  28,
          textAlign:     "center" as const,
        }}>
          {clientName}
        </p>

        {/* Gold line */}
        <GoldLine width={80} style={{ marginBottom: 32 }} />

        {/* Reel title */}
        <h1 style={{
          fontFamily:  T.serif,
          fontSize:    64,
          fontWeight:  300,
          color:       T.cream,
          lineHeight:  1.15,
          letterSpacing: "-0.01em",
          textAlign:   "center" as const,
          margin:      0,
          maxWidth:    860,
        }}>
          {reelTitle}
        </h1>

        {/* Website URL */}
        <p style={{
          fontFamily:    T.mono,
          fontSize:      18,
          color:         "rgba(197,166,92,0.3)",
          marginTop:     36,
          letterSpacing: "0.06em",
        }}>
          {websiteUrl.replace(/^https?:\/\//, "")}
        </p>
      </div>

      {/* Corner accent marks */}
      <div style={{ position: "absolute", top: 60, left: 60, width: 40, height: 40, borderTop: `1px solid ${T.goldFaint}`, borderLeft: `1px solid ${T.goldFaint}` }} />
      <div style={{ position: "absolute", top: 60, right: 60, width: 40, height: 40, borderTop: `1px solid ${T.goldFaint}`, borderRight: `1px solid ${T.goldFaint}` }} />
      <div style={{ position: "absolute", bottom: 60, left: 60, width: 40, height: 40, borderBottom: `1px solid ${T.goldFaint}`, borderLeft: `1px solid ${T.goldFaint}` }} />
      <div style={{ position: "absolute", bottom: 60, right: 60, width: 40, height: 40, borderBottom: `1px solid ${T.goldFaint}`, borderRight: `1px solid ${T.goldFaint}` }} />
    </AbsoluteFill>
  );
}

// ── Scene: Hook Card ──────────────────────────────────────────────────────────

function HookCard({ hook }: { hook: string }) {
  const opacity = useFade(14, 12);
  const frame   = useCurrentFrame();
  const scale   = interpolate(frame, [0, 20], [0.96, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: T.bgPure, opacity }}>
      <div style={{
        position:       "absolute",
        inset:          0,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "0 12%",
        transform:      `scale(${scale})`,
      }}>
        {/* Opening quote mark */}
        <p style={{
          fontFamily:  T.serif,
          fontSize:    80,
          color:       T.gold,
          opacity:     0.35,
          lineHeight:  0.5,
          marginBottom:16,
          textAlign:   "center" as const,
          letterSpacing: 0,
        }}>
          &ldquo;
        </p>

        {/* Hook text */}
        <p style={{
          fontFamily:    T.serif,
          fontSize:      68,
          fontWeight:    300,
          fontStyle:     "italic",
          color:         T.cream,
          lineHeight:    1.2,
          letterSpacing: "-0.01em",
          textAlign:     "center" as const,
          margin:        0,
          maxWidth:      820,
        }}>
          {hook}
        </p>

        {/* Closing quote mark */}
        <p style={{
          fontFamily:  T.serif,
          fontSize:    80,
          color:       T.gold,
          opacity:     0.35,
          lineHeight:  0.5,
          marginTop:   20,
          textAlign:   "center" as const,
          letterSpacing: 0,
        }}>
          &rdquo;
        </p>

        {/* Gold line underline */}
        <GoldLine width={48} style={{ marginTop: 40 }} />
      </div>
    </AbsoluteFill>
  );
}

// ── Scene: Screenshot Scene ───────────────────────────────────────────────────

function ScreenshotScene({ scene, visualStyle }: { scene: RenderScene; visualStyle: string }) {
  const opacity = useFade(14, 12);
  const frame   = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Ken Burns: slow zoom across the scene duration
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
  });

  // Text slides up on entry
  const textY = interpolate(frame, [0, 18], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const isLuxury   = visualStyle === "luxury";
  const isCinematic = visualStyle === "cinematic";

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Screenshot background */}
      {scene.screenshotUrl ? (
        <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
          <Img
            src={scene.screenshotUrl}
            style={{
              width:     "100%",
              height:    "100%",
              objectFit: "cover",
              filter:    isCinematic
                ? "brightness(0.52) saturate(0.85) contrast(1.1)"
                : isLuxury
                ? "brightness(0.48) saturate(0.7)"
                : "brightness(0.55) saturate(0.9)",
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: "#0a0a0a" }} />
      )}

      {/* Gradient overlay: dark at bottom, lighter at top */}
      <AbsoluteFill style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.15) 65%, transparent 100%)",
      }} />

      {/* Scene number + label — top left */}
      <div style={{
        position:   "absolute",
        top:        64,
        left:       64,
        display:    "flex",
        alignItems: "center",
        gap:        14,
        transform:  `translateY(${textY}px)`,
      }}>
        <span style={{
          fontFamily:    T.sans,
          fontSize:      15,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          color:         T.goldDim,
        }}>
          {String(scene.number).padStart(2, "0")}
        </span>
        <div style={{ width: 24, height: 1, background: T.goldDim }} />
        <span style={{
          fontFamily:    T.sans,
          fontSize:      15,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color:         "rgba(255,255,255,0.3)",
        }}>
          {scene.title}
        </span>
      </div>

      {/* Main text block — bottom */}
      <div style={{
        position:  "absolute",
        bottom:    "14%",
        left:      64,
        right:     64,
        transform: `translateY(${textY * -0.5}px)`,
      }}>
        {/* Gold accent line above text */}
        <GoldLine width={56} style={{ marginBottom: 24 }} />

        {/* On-screen text */}
        <p style={{
          fontFamily:  T.serif,
          fontSize:    54,
          fontWeight:  300,
          color:       T.cream,
          lineHeight:  1.2,
          letterSpacing: "-0.01em",
          margin:      0,
        }}>
          {scene.onScreenText}
        </p>
      </div>

      {/* Vignette */}
      <AbsoluteFill style={{
        boxShadow: "inset 0 0 200px rgba(0,0,0,0.6)",
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
}

// ── Scene: CTA End Card ───────────────────────────────────────────────────────

function CtaCard({ ctaText, websiteUrl, clientName }: { ctaText: string; websiteUrl: string; clientName: string }) {
  const opacity = useFade(16, 14);
  const frame   = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(progress, [0, 0.6], [0, 120], { extrapolateRight: "clamp" });
  const textY = interpolate(frame, [0, 20], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: T.bgPure, opacity }}>
      <div style={{
        position:       "absolute",
        inset:          0,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "0 10%",
        transform:      `translateY(${textY}px)`,
      }}>
        {/* Animated gold line */}
        <div style={{ width: lineWidth, height: 1, background: T.gold, marginBottom: 40 }} />

        {/* CTA text */}
        <p style={{
          fontFamily:    T.serif,
          fontSize:      60,
          fontWeight:    300,
          color:         T.cream,
          textAlign:     "center" as const,
          lineHeight:    1.2,
          letterSpacing: "-0.01em",
          margin:        0,
          maxWidth:      840,
        }}>
          {ctaText}
        </p>

        {/* Divider */}
        <div style={{ width: 40, height: 1, background: T.goldDim, margin: "36px 0" }} />

        {/* Client name */}
        <p style={{
          fontFamily:    T.sans,
          fontSize:      20,
          letterSpacing: "0.2em",
          textTransform: "uppercase" as const,
          color:         T.goldDim,
          marginBottom:  12,
        }}>
          {clientName}
        </p>

        {/* Website URL */}
        <p style={{
          fontFamily:    T.mono,
          fontSize:      17,
          color:         "rgba(197,166,92,0.28)",
          letterSpacing: "0.05em",
        }}>
          {websiteUrl.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene: Outro ──────────────────────────────────────────────────────────────

function Outro() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, durationInFrames], [1, 0], { extrapolateRight: "clamp" });

  return <AbsoluteFill style={{ background: T.bgPure, opacity }} />;
}

// ── Root composition ──────────────────────────────────────────────────────────

export const KxdReelComposition: React.FC<KxdReelProps> = ({
  reelTitle,
  clientName,
  websiteUrl,
  hook,
  scenes,
  ctaText,
  visualStyle,
  titleFrames,
  hookFrames,
  ctaFrames,
  outroFrames,
}) => {
  let cursor = 0;

  const titleFrom = cursor;
  cursor += titleFrames;

  const hookFrom = cursor;
  cursor += hookFrames;

  const sceneFroms: number[] = [];
  for (const scene of scenes) {
    sceneFroms.push(cursor);
    cursor += scene.durationFrames;
  }

  const ctaFrom   = cursor;
  cursor += ctaFrames;

  const outroFrom = cursor;

  return (
    <AbsoluteFill style={{ background: T.bgPure }}>

      {/* Title card */}
      <Sequence from={titleFrom} durationInFrames={titleFrames} name="Title">
        <TitleCard reelTitle={reelTitle} clientName={clientName} websiteUrl={websiteUrl} />
      </Sequence>

      {/* Hook card */}
      <Sequence from={hookFrom} durationInFrames={hookFrames} name="Hook">
        <HookCard hook={hook} />
      </Sequence>

      {/* Screenshot scenes */}
      {scenes.map((scene, i) => (
        <Sequence key={i} from={sceneFroms[i]} durationInFrames={scene.durationFrames} name={`Scene-${scene.number}`}>
          <ScreenshotScene scene={scene} visualStyle={visualStyle} />
        </Sequence>
      ))}

      {/* CTA end card */}
      <Sequence from={ctaFrom} durationInFrames={ctaFrames} name="CTA">
        <CtaCard ctaText={ctaText} websiteUrl={websiteUrl} clientName={clientName} />
      </Sequence>

      {/* Outro */}
      <Sequence from={outroFrom} durationInFrames={outroFrames} name="Outro">
        <Outro />
      </Sequence>

    </AbsoluteFill>
  );
};
