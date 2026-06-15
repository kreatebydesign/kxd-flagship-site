"use client";

/**
 * ReelDetailClient.tsx
 * KXD OS — Phase 5A Reel Detail
 *
 * Interactive detail view for a single website showcase reel.
 * Allows screenshot capture + storyboard generation + full review.
 */

import { useState } from "react";
import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";

// ── Brand tokens ──────────────────────────────────────────────────────────────

const C = {
  bgBase:     "#080808",
  bgElevated: "#111",
  bgInput:    "#0d0d0d",
  gold:       "#C5A65C",
  goldDim:    "rgba(197,166,92,0.55)",
  goldFaint:  "rgba(197,166,92,0.06)",
  cream:      "#f8f3ea",
  creamMuted: "#bfb7aa",
  border:     "rgba(255,255,255,0.07)",
  borderGold: "rgba(197,166,92,0.22)",
  red:        "#d25a5a",
  green:      "#5ec68c",
  sans:       "var(--font-outfit, Inter, system-ui)",
  serif:      "var(--font-cormorant, Georgia)",
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clientName(doc: AnyDoc): string {
  if (doc.clientName) return String(doc.clientName);
  if (doc.client && typeof doc.client === "object") return String(doc.client.name || "Client");
  return "Client";
}

function screenshotCount(doc: AnyDoc): number {
  if (!Array.isArray(doc.capturedScreenshots)) return 0;
  return doc.capturedScreenshots.length;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily:    C.sans,
      fontSize:      "0.4375rem",
      letterSpacing: "0.16em",
      textTransform: "uppercase" as const,
      color:         C.goldDim,
      marginBottom:  "1rem",
    }}>
      {children}
    </p>
  );
}

function Panel({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? C.goldFaint : C.bgElevated,
      border:     `1px solid ${accent ? C.borderGold : C.border}`,
      padding:    "1.5rem",
    }}>
      {children}
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily:    C.sans,
      fontSize:      "0.4375rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      color,
      border:        `1px solid currentColor`,
      padding:       "0.25rem 0.625rem",
      opacity:       0.9,
    }}>
      {label}
    </span>
  );
}

// ── Screenshot grid ───────────────────────────────────────────────────────────

function ScreenshotGrid({ screenshots }: { screenshots: AnyDoc[] }) {
  const LABELS: Record<string, string> = {
    hero:         "Hero",
    services:     "Services",
    testimonials: "Testimonials",
    "cta-footer": "CTA / Footer",
    "full-brand": "Full Page",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
      {screenshots.map((ss: AnyDoc, i: number) => {
        const url   = ss.url || ss.filename || null;
        const label = LABELS[ss.alt?.toLowerCase().split("—")[1]?.trim() || ""] || `Screenshot ${i + 1}`;
        return (
          <div key={ss.id || i} style={{ background: C.bgInput, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {url ? (
              <img
                src={url}
                alt={ss.alt || label}
                style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ width: "100%", height: "140px", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.18)" }}>No preview</p>
              </div>
            )}
            <div style={{ padding: "0.625rem 0.75rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.goldDim }}>
                {ss.alt || label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Scene sequence display ────────────────────────────────────────────────────

function SceneSequenceBlock({ text }: { text: string }) {
  const scenes = text.split("---").map(s => s.trim()).filter(Boolean);
  if (scenes.length === 0) return (
    <pre style={{ fontFamily: "monospace", fontSize: "0.5625rem", color: C.creamMuted, lineHeight: 1.7, whiteSpace: "pre-wrap" as const, margin: 0 }}>
      {text}
    </pre>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
      {scenes.map((scene, i) => (
        <div key={i} style={{ background: C.bgInput, border: `1px solid ${C.border}`, padding: "1rem 1.25rem" }}>
          <pre style={{ fontFamily: "monospace", fontSize: "0.5rem", color: C.creamMuted, lineHeight: 1.8, whiteSpace: "pre-wrap" as const, margin: 0 }}>
            {scene}
          </pre>
        </div>
      ))}
    </div>
  );
}

// ── Caption options block ─────────────────────────────────────────────────────

function CaptionOptionsBlock({ text }: { text: string }) {
  const options = text.split("---").map(s => s.trim()).filter(Boolean);
  const letters = ["A", "B", "C"];
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
      {options.map((caption, i) => (
        <div key={i} style={{ background: C.bgInput, border: `1px solid ${C.border}`, padding: "0.875rem 1rem" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.5rem" }}>
            Option {letters[i] || i + 1}
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.cream, lineHeight: 1.6 }}>
            {caption}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReelDetailClient({ doc }: { doc: AnyDoc }) {
  const [screenshotState, setScreenshotState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [screenshotMsg,   setScreenshotMsg]   = useState<string | null>(null);
  const [storyboardState, setStoryboardState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [storyboardMsg,   setStoryboardMsg]   = useState<string | null>(null);

  const screenshots: AnyDoc[] = Array.isArray(doc.capturedScreenshots) ? doc.capturedScreenshots : [];
  const shotCount   = screenshotCount(doc);
  const hasStoryboard = doc.storyboardGenerationStatus === "complete" && doc.generatedScript;
  const hasScreenshots = doc.screenshotStatus === "complete" && shotCount > 0;

  async function captureScreenshots() {
    setScreenshotState("loading");
    setScreenshotMsg(null);
    try {
      const res  = await fetch("/api/admin/reels/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoVideoRequestId: doc.id }),
      });
      const data = await res.json();
      if (data.success) {
        setScreenshotState("done");
        setScreenshotMsg(`${data.uploaded} screenshots captured and saved to Media. Refresh to see results.`);
      } else {
        setScreenshotState("error");
        setScreenshotMsg(data.error || data.errors?.join(", ") || "Screenshot capture failed.");
      }
    } catch (err) {
      setScreenshotState("error");
      setScreenshotMsg(`Network error: ${String(err)}`);
    }
  }

  async function generateStoryboard() {
    setStoryboardState("loading");
    setStoryboardMsg(null);
    try {
      const res  = await fetch("/api/admin/reels/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoVideoRequestId: doc.id }),
      });
      const data = await res.json();
      if (data.success) {
        setStoryboardState("done");
        if (data.promptOnly) {
          setStoryboardMsg("Prompt assembled (OPENAI_API_KEY not set). Set the key and regenerate to get the full storyboard.");
        } else {
          setStoryboardMsg(`Storyboard generated in ${data.elapsedMs}ms. Refresh to view the full output.`);
        }
      } else {
        setStoryboardState("error");
        setStoryboardMsg(data.error || data.generationError || "Storyboard generation failed.");
      }
    } catch (err) {
      setStoryboardState("error");
      setStoryboardMsg(`Network error: ${String(err)}`);
    }
  }

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "1.25rem", borderBottom: `1px solid ${C.borderGold}`, position: "sticky", top: 0, zIndex: 50, background: C.bgBase }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <KxdLogo />
            <div>
              <p style={{ color: C.goldDim, fontSize: "0.5rem", letterSpacing: "0.1em" }}>Reel Detail</p>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.cream, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "24rem" }}>
                {doc.videoTitle || "Untitled Reel"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link href="/admin/operations/reels" style={{ color: C.goldDim, fontSize: "0.5rem", letterSpacing: "0.1em", textDecoration: "none" }}>
              ← Reels
            </Link>
            <Link href={`/admin/collections/promo-video-requests/${doc.id}`} style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.5rem", letterSpacing: "0.1em", textDecoration: "none" }}>
              Edit in Payload →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: "2rem", display: "flex", flexDirection: "column" as const, gap: "2rem" }}>

        {/* ── Brief summary ───────────────────────────────────────────────── */}
        <Panel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" as const }}>
            <div>
              <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.5rem" }}>
                {clientName(doc)}
              </p>
              <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.5rem, 3vw, 2rem)", color: C.cream, lineHeight: 1.1 }}>
                {doc.videoTitle || "Untitled Reel"}
              </h1>
              {doc.websiteUrl && (
                <a href={doc.websiteUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "monospace", fontSize: "0.5rem", color: C.goldDim, marginTop: "0.5rem", display: "inline-block" }}>
                  {doc.websiteUrl} ↗
                </a>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem", alignItems: "flex-end" }}>
              <StatusBadge label={(doc.status || "new").replace("-", " ")} color={C.gold} />
              {doc.platform    && <StatusBadge label={doc.platform}    color={C.creamMuted} />}
              {doc.visualStyle && <StatusBadge label={doc.visualStyle} color={C.creamMuted} />}
            </div>
          </div>
          {doc.goal && (
            <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.2)", marginBottom: "0.375rem" }}>
                Goal
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.creamMuted, lineHeight: 1.6 }}>
                {doc.goal}
              </p>
            </div>
          )}
        </Panel>

        {/* ── Action panel ────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

          {/* Screenshot action */}
          <Panel accent={!hasScreenshots}>
            <SectionLabel>Step 01 — Screenshot Capture</SectionLabel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.cream, marginBottom: "0.375rem" }}>
                  {hasScreenshots ? `${shotCount} sections captured` : "No screenshots yet"}
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
                  Playwright captures hero, services, testimonials, CTA, and full-page sections.
                </p>
              </div>
              <StatusBadge
                label={doc.screenshotStatus || "idle"}
                color={doc.screenshotStatus === "complete" ? C.green : doc.screenshotStatus === "failed" ? C.red : C.goldDim}
              />
            </div>
            {doc.websiteUrl ? (
              <button
                onClick={captureScreenshots}
                disabled={screenshotState === "loading"}
                style={{
                  fontFamily:    C.sans,
                  fontWeight:    500,
                  fontSize:      "0.5rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase" as const,
                  color:         C.bgBase,
                  background:    screenshotState === "loading"
                    ? "rgba(197,166,92,0.4)"
                    : "linear-gradient(180deg, #d1b06b 0%, #c5a65c 48%, #b09040 100%)",
                  border:        "none",
                  padding:       "0.75rem 1.5rem",
                  cursor:        screenshotState === "loading" ? "not-allowed" : "pointer",
                  width:         "100%",
                }}
              >
                {screenshotState === "loading" ? "Capturing…" : hasScreenshots ? "Recapture Screenshots" : "Capture Screenshots"}
              </button>
            ) : (
              <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.red }}>
                No website URL. Edit this record and add one.
              </p>
            )}
            {screenshotMsg && (
              <p style={{
                fontFamily: C.sans,
                fontSize:   "0.5rem",
                lineHeight: 1.5,
                marginTop:  "0.75rem",
                color:      screenshotState === "error" ? C.red : C.green,
              }}>
                {screenshotMsg}
              </p>
            )}
          </Panel>

          {/* Storyboard action */}
          <Panel accent={hasScreenshots && !hasStoryboard}>
            <SectionLabel>Step 02 — Storyboard Generation</SectionLabel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.cream, marginBottom: "0.375rem" }}>
                  {hasStoryboard ? "Storyboard complete" : "No storyboard yet"}
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
                  Brand-aware AI generation: hook, scene sequence, transitions, captions, CTA, and music direction.
                </p>
              </div>
              <StatusBadge
                label={doc.storyboardGenerationStatus || "idle"}
                color={doc.storyboardGenerationStatus === "complete" ? C.green : doc.storyboardGenerationStatus === "failed" ? C.red : C.goldDim}
              />
            </div>
            <button
              onClick={generateStoryboard}
              disabled={storyboardState === "loading"}
              style={{
                fontFamily:    C.sans,
                fontWeight:    500,
                fontSize:      "0.5rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
                color:         C.bgBase,
                background:    storyboardState === "loading"
                  ? "rgba(197,166,92,0.4)"
                  : "linear-gradient(180deg, #d1b06b 0%, #c5a65c 48%, #b09040 100%)",
                border:        "none",
                padding:       "0.75rem 1.5rem",
                cursor:        storyboardState === "loading" ? "not-allowed" : "pointer",
                width:         "100%",
              }}
            >
              {storyboardState === "loading" ? "Generating…" : hasStoryboard ? "Regenerate Storyboard" : "Generate Storyboard"}
            </button>
            {storyboardMsg && (
              <p style={{
                fontFamily: C.sans,
                fontSize:   "0.5rem",
                lineHeight: 1.5,
                marginTop:  "0.75rem",
                color:      storyboardState === "error" ? C.red : C.green,
              }}>
                {storyboardMsg}
              </p>
            )}
          </Panel>
        </div>

        {/* ── Hook ────────────────────────────────────────────────────────── */}
        {doc.reelHook && (
          <Panel accent>
            <SectionLabel>Reel Hook (0:00–0:03)</SectionLabel>
            <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.25rem, 3vw, 2rem)", color: C.cream, lineHeight: 1.2, fontStyle: "italic", letterSpacing: "-0.01em" }}>
              &ldquo;{doc.reelHook}&rdquo;
            </p>
            {doc.reelTitle && (
              <p style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.goldDim, marginTop: "1rem" }}>
                Reel Title: {doc.reelTitle}
              </p>
            )}
          </Panel>
        )}

        {/* ── Scene sequence ───────────────────────────────────────────────── */}
        {doc.sceneSequence && (
          <div>
            <Panel>
              <SectionLabel>Scene Sequence</SectionLabel>
              <SceneSequenceBlock text={doc.sceneSequence} />
            </Panel>
          </div>
        )}

        {/* ── Two-col: transition style + CTA ─────────────────────────────── */}
        {(doc.transitionStyle || doc.ctaText) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {doc.transitionStyle && (
              <Panel>
                <SectionLabel>Transition Style</SectionLabel>
                <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.cream, lineHeight: 1.6 }}>
                  {doc.transitionStyle}
                </p>
              </Panel>
            )}
            {doc.ctaText && (
              <Panel accent>
                <SectionLabel>CTA</SectionLabel>
                <p style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "1.25rem", color: C.cream }}>
                  {doc.ctaText}
                </p>
              </Panel>
            )}
          </div>
        )}

        {/* ── Music direction ──────────────────────────────────────────────── */}
        {doc.musicDirection && (
          <Panel>
            <SectionLabel>Music Direction</SectionLabel>
            <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.cream, lineHeight: 1.6 }}>
              {doc.musicDirection}
            </p>
          </Panel>
        )}

        {/* ── Caption options ──────────────────────────────────────────────── */}
        {doc.captionOptions && (
          <div>
            <Panel>
              <SectionLabel>Caption Options (A/B/C)</SectionLabel>
              <CaptionOptionsBlock text={doc.captionOptions} />
            </Panel>
          </div>
        )}

        {/* ── Post copy (hook + hashtags) ──────────────────────────────────── */}
        {doc.generatedPostCopy && (
          <Panel>
            <SectionLabel>Post Copy &amp; Hashtags</SectionLabel>
            <pre style={{ fontFamily: "monospace", fontSize: "0.5625rem", color: C.creamMuted, lineHeight: 1.8, whiteSpace: "pre-wrap" as const, margin: 0 }}>
              {doc.generatedPostCopy}
            </pre>
          </Panel>
        )}

        {/* ── Screenshots ──────────────────────────────────────────────────── */}
        {screenshots.length > 0 && (
          <div>
            <Panel>
              <SectionLabel>Captured Screenshots ({screenshots.length})</SectionLabel>
              <ScreenshotGrid screenshots={screenshots} />
            </Panel>
          </div>
        )}

        {/* ── Full storyboard text ──────────────────────────────────────────── */}
        {doc.generatedScript && (
          <Panel>
            <SectionLabel>Full Storyboard Output</SectionLabel>
            <pre style={{
              fontFamily: "monospace",
              fontSize:   "0.5rem",
              color:      C.creamMuted,
              lineHeight: 1.8,
              whiteSpace: "pre-wrap" as const,
              margin:     0,
              maxHeight:  "28rem",
              overflow:   "auto",
            }}>
              {doc.generatedScript}
            </pre>
          </Panel>
        )}

        {/* ── Generation error ─────────────────────────────────────────────── */}
        {doc.storyboardGenerationError && (
          <div style={{ padding: "0.875rem 1.25rem", background: "rgba(210,90,90,0.08)", border: "1px solid rgba(210,90,90,0.3)" }}>
            <p style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.red, marginBottom: "0.375rem" }}>
              Generation Error
            </p>
            <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.red }}>
              {doc.storyboardGenerationError}
            </p>
          </div>
        )}

        {/* ── Footer links ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "1rem", paddingTop: "1rem", borderTop: `1px solid ${C.border}`, flexWrap: "wrap" as const }}>
          <Link href="/admin/operations/reels" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.goldDim, textDecoration: "none" }}>
            ← All Reels
          </Link>
          <Link href={`/admin/collections/promo-video-requests/${doc.id}`} style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>
            Edit Full Record in Payload →
          </Link>
          <Link href="/admin/operations/reels/new" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>
            Create Another Reel
          </Link>
        </div>

      </div>
    </div>
  );
}
