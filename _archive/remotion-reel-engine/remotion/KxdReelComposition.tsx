/**
 * remotion/KxdReelComposition.tsx
 * KXD Creative Engine — Phase 5B (Polish)
 *
 * Premium website showcase reel composition.
 * Renders entirely from data: screenshots + storyboard + brand copy.
 *
 * Scene sequence:
 *   1. Title Card       — reel title on black, editorial serif
 *   2. Hook Card        — hook text, large italic serif, gold accent
 *   3. Screenshot Scenes— browser mockup (upper zone) + text (lower zone)
 *   4. CTA End Card     — CTA text on black, gold line accents
 *   5. Outro            — clean fade to black
 *
 * Phase 5B Polish changes (vs original):
 *   — BrowserFrame component: CSS browser chrome with screenshot inside.
 *     objectFit:"cover" + objectPosition:"top center" shows hero section.
 *   — ScreenshotScene redesigned: screenshot lives in upper zone inside the
 *     browser frame; text lives in a clean lower zone; they never overlap.
 *   — Background: pure T.bg (#080808) + very dim blurred screenshot glow.
 *   — Ken Burns: applied to the whole browser mockup, 1.0→1.022 (was 1.06).
 *   — Bottom gradient: fades from T.bg upward, always protects text.
 *
 * Design tokens (hardcoded — cannot use CSS vars in Remotion Chrome context):
 *   Background:  #080808
 *   Black pure:  #000000
 *   Gold:        #C5A65C
 *   Cream:       #f8f3ea
 *   Serif:       Georgia, "Times New Roman", serif
 *   Sans:        "Helvetica Neue", Arial, sans-serif
 *   Mono:        "Courier New", monospace
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
  // Browser chrome colours
  chromeBar: "#141414",
  chromeBorder: "rgba(255,255,255,0.045)",
} as const;

// ── Scene types ───────────────────────────────────────────────────────────────

export interface RenderScene {
  number:         number;
  title:          string;
  durationFrames: number;
  screenshotUrl:  string | null;
  onScreenText:   string;
  transition:     string;
  screenshotRef:  string;
}

export interface KxdReelProps {
  reelTitle:   string;
  clientName:  string;
  websiteUrl:  string;
  hook:        string;
  scenes:      RenderScene[];
  ctaText:     string;
  platform:    string;
  visualStyle: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
  fps:         number;
  titleFrames: number;
  hookFrames:  number;
  ctaFrames:   number;
  outroFrames: number;
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

// ── Shared helpers ────────────────────────────────────────────────────────────

function useFade(fadeInFrames = 14, fadeOutFrames = 12): number {
  const frame               = useCurrentFrame();
  const { durationInFrames} = useVideoConfig();
  const fadeIn  = interpolate(frame, [0, fadeInFrames],  [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - fadeOutFrames, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(fadeIn, fadeOut);
}

function GoldLine({ width = 64, style }: { width?: number; style?: React.CSSProperties }) {
  return <div style={{ width, height: 1, background: T.gold, flexShrink: 0, ...style }} />;
}

// ── BrowserFrame — CSS browser chrome mockup ──────────────────────────────────
//
// Renders a premium dark browser chrome around the website screenshot.
// The screenshot uses objectFit:"cover" + objectPosition:"top center" so the
// hero section (top of the page) is always visible, with natural bottom crop.
//
// Chrome details:
//   - Dark (#141414) title bar with three KXD-gold traffic light dots
//   - Subtle address bar pill (decorative only — no interactivity)
//   - 1px gold-tinted border around the whole frame
//   - Drop shadow: two layers for depth + ambient glow

function BrowserFrame({
  screenshotUrl,
  frameWidth,
}: {
  screenshotUrl: string | null;
  frameWidth: number;
}) {
  const barH      = 36;
  const radius    = 10;
  // Content area: 16:9 ratio gives clean presentation of any website screenshot
  const contentH  = Math.round(frameWidth * (9 / 16));
  const totalH    = barH + contentH;

  return (
    <div
      style={{
        width:        frameWidth,
        height:       totalH,
        borderRadius: radius,
        overflow:     "hidden",
        boxShadow: [
          "0 48px 120px rgba(0,0,0,0.85)",
          "0 12px 32px rgba(0,0,0,0.55)",
          `0 0 0 1px rgba(197,166,92,0.14)`,
        ].join(", "),
        flexShrink: 0,
      }}
    >
      {/* ── Browser chrome bar ── */}
      <div
        style={{
          height:         barH,
          background:     T.chromeBar,
          display:        "flex",
          alignItems:     "center",
          padding:        "0 14px",
          gap:            7,
          borderBottom:   `1px solid ${T.chromeBorder}`,
          flexShrink:     0,
        }}
      >
        {/* Traffic lights — KXD gold scale instead of system red/yellow/green */}
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.gold, flexShrink: 0 }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(197,166,92,0.32)", flexShrink: 0 }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(197,166,92,0.14)", flexShrink: 0 }} />

        {/* Address bar (decorative) */}
        <div
          style={{
            flex:         1,
            height:       20,
            borderRadius: 10,
            background:   "rgba(255,255,255,0.04)",
            border:       `1px solid ${T.chromeBorder}`,
            margin:       "0 14px",
          }}
        />
      </div>

      {/* ── Website screenshot ── */}
      <div
        style={{
          width:    frameWidth,
          height:   contentH,
          overflow: "hidden",
          background: "#0c0c0c",
          flexShrink: 0,
        }}
      >
        {screenshotUrl ? (
          <Img
            src={screenshotUrl}
            style={{
              width:          "100%",
              height:         "100%",
              objectFit:      "cover",
              // Show the TOP of the page — that is where the hero/branding lives.
              // Anything below the fold is naturally cropped, which is intentional.
              objectPosition: "top center",
              display:        "block",
            }}
          />
        ) : (
          // Placeholder when no screenshot is available yet
          <div
            style={{
              width:      "100%",
              height:     "100%",
              background: "linear-gradient(135deg, #111 0%, #0c0c0c 100%)",
              display:    "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width:        72,
                height:       72,
                border:       `1px solid ${T.goldFaint}`,
                borderRadius: "50%",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scene: Title Card ─────────────────────────────────────────────────────────

function TitleCard({
  reelTitle,
  clientName,
  websiteUrl,
}: {
  reelTitle:  string;
  clientName: string;
  websiteUrl: string;
}) {
  const opacity   = useFade(18, 14);
  const frame     = useCurrentFrame();
  const textSlide = interpolate(frame, [0, 26], [32, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: T.bgPure, opacity }}>
      <div
        style={{
          position:       "absolute",
          inset:          0,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "0 10%",
          transform:      `translateY(${textSlide}px)`,
        }}
      >
        <p
          style={{
            fontFamily:    T.sans,
            fontSize:      22,
            fontWeight:    400,
            letterSpacing: "0.22em",
            textTransform: "uppercase" as const,
            color:         T.goldDim,
            marginBottom:  28,
            textAlign:     "center" as const,
            margin:        "0 0 28px 0",
          }}
        >
          {clientName}
        </p>

        <GoldLine width={80} style={{ marginBottom: 32 }} />

        <h1
          style={{
            fontFamily:    T.serif,
            fontSize:      64,
            fontWeight:    300,
            color:         T.cream,
            lineHeight:    1.15,
            letterSpacing: "-0.01em",
            textAlign:     "center" as const,
            margin:        0,
            maxWidth:      860,
          }}
        >
          {reelTitle}
        </h1>

        <p
          style={{
            fontFamily:    T.mono,
            fontSize:      18,
            color:         "rgba(197,166,92,0.3)",
            marginTop:     36,
            letterSpacing: "0.06em",
          }}
        >
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
  const scale   = interpolate(frame, [0, 22], [0.96, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: T.bgPure, opacity }}>
      <div
        style={{
          position:       "absolute",
          inset:          0,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "0 12%",
          transform:      `scale(${scale})`,
        }}
      >
        <p
          style={{
            fontFamily:    T.serif,
            fontSize:      80,
            color:         T.gold,
            opacity:       0.35,
            lineHeight:    0.5,
            marginBottom:  16,
            textAlign:     "center" as const,
            letterSpacing: 0,
          }}
        >
          &ldquo;
        </p>

        <p
          style={{
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
          }}
        >
          {hook}
        </p>

        <p
          style={{
            fontFamily:    T.serif,
            fontSize:      80,
            color:         T.gold,
            opacity:       0.35,
            lineHeight:    0.5,
            marginTop:     20,
            textAlign:     "center" as const,
            letterSpacing: 0,
          }}
        >
          &rdquo;
        </p>

        <GoldLine width={48} style={{ marginTop: 40 }} />
      </div>
    </AbsoluteFill>
  );
}

// ── Scene: Screenshot Scene (redesigned) ─────────────────────────────────────
//
// Layout philosophy:
//   Screenshot lives in a browser mockup in the UPPER zone (~50-55% height).
//   Text copy lives in a clean LOWER zone (~22-28% height).
//   They do not overlap. A gradient from T.bg at the bottom fades upward to
//   ensure the text is always readable regardless of screenshot brightness.
//
// Ken Burns:
//   Applied to the whole browser mockup container — 1.0→1.022 over the scene.
//   The original 1.06 zoom was too aggressive and introduced crop distortion.
//   Moving the transform to the mockup container keeps the browser chrome intact.
//
// Background:
//   Pure T.bg (#080808) + a 10% opacity blurred copy of the screenshot as an
//   ambient glow. This adds depth without competing with the mockup or text.

function ScreenshotScene({
  scene,
  visualStyle,
}: {
  scene:       RenderScene;
  visualStyle: string;
}) {
  const { width, height } = useVideoConfig();
  const frame             = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity           = useFade(18, 14);

  const isLandscape = width >= height;

  // ── Ken Burns: gentle scale on the whole mockup ────────────────────────────
  // Direction alternates per scene number so adjacent scenes feel differentiated.
  const even        = scene.number % 2 === 0;
  const scaleEnd    = 1.022;
  const mockupScale = interpolate(frame, [0, durationInFrames], [1.0, scaleEnd], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
  });
  // Subtle horizontal drift — opposite direction per scene
  const driftEnd = even ? 10 : -10;
  const mockupX  = interpolate(frame, [0, durationInFrames], [0, driftEnd], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
  });

  // ── Text entrance ──────────────────────────────────────────────────────────
  const textY       = interpolate(frame, [0, 22], [36, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [0, 20], [0, 1],  { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Browser mockup sizing ──────────────────────────────────────────────────
  // Portrait (9:16): 88% canvas width so it fills the frame confidently.
  // Landscape (16:9): 55% width so the mockup sits centred with breathing room.
  const mockupW     = Math.round(width * (isLandscape ? 0.55 : 0.88));
  const barH        = 36;
  const contentH    = Math.round(mockupW * (9 / 16));
  const mockupTotalH = barH + contentH;

  // ── Vertical layout ────────────────────────────────────────────────────────
  // Mockup sits in the upper portion. Text anchors to the bottom.
  // Portrait: mockup top at ~11%, leaving ~55% of canvas below for text + space.
  // Landscape: mockup is centred vertically.
  const mockupTopPx = isLandscape
    ? Math.round((height - mockupTotalH) / 2)   // centred
    : Math.round(height * 0.11);                // upper zone

  // Text bottom offset from canvas edge
  const textBottomPx = isLandscape ? 72 : 100;

  // Font size responsive to canvas orientation
  const textFontSize = isLandscape ? 44 : 52;

  // ── Visual-style image treatment ──────────────────────────────────────────
  // Applied only to the background glow, not to the mockup screenshot.
  // The mockup screenshot is always neutral so colour grading doesn't obscure UI.
  const bgFilter = visualStyle === "luxury"
    ? "blur(52px) brightness(0.12) saturate(0.35)"
    : visualStyle === "cinematic"
    ? "blur(52px) brightness(0.15) saturate(0.5) contrast(1.05)"
    : "blur(52px) brightness(0.14) saturate(0.4)";

  return (
    <AbsoluteFill style={{ background: T.bg, opacity }}>

      {/* ── Layer 1: Ambient background glow ─────────────────────────────── */}
      {/* Very dim blurred screenshot — adds depth without competing content. */}
      {scene.screenshotUrl && (
        <AbsoluteFill style={{ opacity: 0.1 }}>
          <Img
            src={scene.screenshotUrl}
            style={{
              width:          "100%",
              height:         "100%",
              objectFit:      "cover",
              objectPosition: "top center",
              filter:         bgFilter,
              transform:      "scale(1.08)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ── Layer 2: Scene label — top left ───────────────────────────────── */}
      <div
        style={{
          position:   "absolute",
          top:        64,
          left:       64,
          display:    "flex",
          alignItems: "center",
          gap:        14,
          zIndex:     2,
        }}
      >
        <span
          style={{
            fontFamily:    T.sans,
            fontSize:      15,
            letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
            color:         T.goldDim,
          }}
        >
          {String(scene.number).padStart(2, "0")}
        </span>
        <div style={{ width: 24, height: 1, background: T.goldDim }} />
        <span
          style={{
            fontFamily:    T.sans,
            fontSize:      15,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color:         "rgba(255,255,255,0.28)",
          }}
        >
          {scene.title}
        </span>
      </div>

      {/* ── Layer 3: Browser mockup — upper zone ──────────────────────────── */}
      <div
        style={{
          position:        "absolute",
          top:             mockupTopPx,
          left:            0,
          right:           0,
          display:         "flex",
          justifyContent:  "center",
          alignItems:      "flex-start",
          // Ken Burns on the whole mockup container — chrome + content move as one
          transform:       `scale(${mockupScale}) translateX(${mockupX}px)`,
          transformOrigin: "center top",
          zIndex:          3,
        }}
      >
        <BrowserFrame screenshotUrl={scene.screenshotUrl} frameWidth={mockupW} />
      </div>

      {/* ── Layer 4: Bottom gradient ───────────────────────────────────────── */}
      {/* Rises from T.bg at the bottom edge to transparent ~55% up the canvas. */}
      {/* Ensures the text zone is always dark enough regardless of bg glow.    */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${T.bg} 0%, ${T.bg}f0 25%, ${T.bg}99 42%, transparent 60%)`,
          pointerEvents: "none",
          zIndex:        4,
        }}
      />

      {/* ── Layer 5: Text block — lower zone ──────────────────────────────── */}
      <div
        style={{
          position:  "absolute",
          bottom:    textBottomPx,
          left:      64,
          right:     64,
          transform: `translateY(${textY}px)`,
          opacity:   textOpacity,
          zIndex:    5,
        }}
      >
        <GoldLine width={52} style={{ marginBottom: 22 }} />
        <p
          style={{
            fontFamily:    T.serif,
            fontSize:      textFontSize,
            fontWeight:    300,
            color:         T.cream,
            lineHeight:    1.22,
            letterSpacing: "-0.01em",
            margin:        0,
          }}
        >
          {scene.onScreenText}
        </p>
      </div>

    </AbsoluteFill>
  );
}

// ── Scene: CTA End Card ───────────────────────────────────────────────────────

function CtaCard({
  ctaText,
  websiteUrl,
  clientName,
}: {
  ctaText:    string;
  websiteUrl: string;
  clientName: string;
}) {
  const opacity   = useFade(16, 14);
  const frame     = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress  = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(progress, [0, 0.55], [0, 120], { extrapolateRight: "clamp" });
  const textY     = interpolate(frame, [0, 22], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: T.bgPure, opacity }}>
      <div
        style={{
          position:       "absolute",
          inset:          0,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "0 10%",
          transform:      `translateY(${textY}px)`,
        }}
      >
        <div style={{ width: lineWidth, height: 1, background: T.gold, marginBottom: 40 }} />

        <p
          style={{
            fontFamily:    T.serif,
            fontSize:      60,
            fontWeight:    300,
            color:         T.cream,
            textAlign:     "center" as const,
            lineHeight:    1.2,
            letterSpacing: "-0.01em",
            margin:        0,
            maxWidth:      840,
          }}
        >
          {ctaText}
        </p>

        <div style={{ width: 40, height: 1, background: T.goldDim, margin: "36px 0" }} />

        <p
          style={{
            fontFamily:    T.sans,
            fontSize:      20,
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
            color:         T.goldDim,
            marginBottom:  12,
          }}
        >
          {clientName}
        </p>

        <p
          style={{
            fontFamily:    T.mono,
            fontSize:      17,
            color:         "rgba(197,166,92,0.28)",
            letterSpacing: "0.05em",
          }}
        >
          {websiteUrl.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene: Outro ──────────────────────────────────────────────────────────────

function Outro() {
  const frame              = useCurrentFrame();
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

      <Sequence from={titleFrom} durationInFrames={titleFrames} name="Title">
        <TitleCard reelTitle={reelTitle} clientName={clientName} websiteUrl={websiteUrl} />
      </Sequence>

      <Sequence from={hookFrom} durationInFrames={hookFrames} name="Hook">
        <HookCard hook={hook} />
      </Sequence>

      {scenes.map((scene, i) => (
        <Sequence
          key={i}
          from={sceneFroms[i]}
          durationInFrames={scene.durationFrames}
          name={`Scene-${scene.number}`}
        >
          <ScreenshotScene scene={scene} visualStyle={visualStyle} />
        </Sequence>
      ))}

      <Sequence from={ctaFrom} durationInFrames={ctaFrames} name="CTA">
        <CtaCard ctaText={ctaText} websiteUrl={websiteUrl} clientName={clientName} />
      </Sequence>

      <Sequence from={outroFrom} durationInFrames={outroFrames} name="Outro">
        <Outro />
      </Sequence>

    </AbsoluteFill>
  );
};
