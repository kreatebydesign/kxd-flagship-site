"use client";

/**
 * ReelDetailClient.tsx
 * KXD OS — Phase 5A + 5B Reel Detail
 *
 * Interactive detail view for a single website showcase reel.
 * Step 01: Screenshot capture
 * Step 02: Storyboard generation
 * Step 03: MP4 render (Remotion — local dev only; Phase 5C for cloud)
 */

import { useState } from "react";
import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsCard, OpsSectionHead, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import {
  KxdButton,
  KxdPage,
  KxdSection,
  KxdSurface,
  type KxdBadgeVariant,
} from "@/components/os";

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

function statusVariant(status: string): KxdBadgeVariant {
  switch (status) {
    case "new":
      return "tier";
    case "storyboarding":
    case "scripting":
    case "editing":
    case "review":
      return "warning";
    case "approved":
    case "delivered":
      return "success";
    case "archived":
      return "default";
    default:
      return "critical";
  }
}

function pipelineStatusVariant(status: string, state?: string): KxdBadgeVariant {
  if (state === "loading" || status === "rendering" || status === "capturing" || status === "generating") {
    return "warning";
  }
  if (status === "complete" || state === "done") return "success";
  if (status === "failed" || state === "error") return "critical";
  return "default";
}

function StepPanel({
  label,
  accent = false,
  children,
}: {
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <KxdSurface variant={accent ? "raised" : "panel"} className="kxd-os-ops-workflow-panel">
      <KxdSection label={label}>{children}</KxdSection>
    </KxdSurface>
  );
}

function ActionFeedback({ message, isError }: { message: string; isError: boolean }) {
  if (isError) {
    return (
      <div className="kxd-os-ops-alert kxd-os-ops-alert--error mt-3">
        <p>{message}</p>
      </div>
    );
  }
  return <p className="kxd-os-meta mt-3">{message}</p>;
}

// ── Screenshot grid ───────────────────────────────────────────────────────────

function ScreenshotGrid({ screenshots }: { screenshots: AnyDoc[] }) {
  const LABELS: Record<string, string> = {
    hero: "Hero",
    services: "Services",
    testimonials: "Testimonials",
    "cta-footer": "CTA / Footer",
    "full-brand": "Full Page",
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
      {screenshots.map((ss: AnyDoc, i: number) => {
        const url = ss.url || ss.filename || null;
        const label = LABELS[ss.alt?.toLowerCase().split("—")[1]?.trim() || ""] || `Screenshot ${i + 1}`;
        return (
          <KxdSurface key={ss.id || i} variant="panel" className="overflow-hidden">
            {url ? (
              <img
                src={url}
                alt={ss.alt || label}
                className="block h-[140px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[140px] items-center justify-center bg-white/[0.03]">
                <p className="kxd-os-caption">No preview</p>
              </div>
            )}
            <div className="p-3">
              <p className="kxd-os-section__label">{ss.alt || label}</p>
            </div>
          </KxdSurface>
        );
      })}
    </div>
  );
}

// ── Scene sequence display ────────────────────────────────────────────────────

function SceneSequenceBlock({ text }: { text: string }) {
  const scenes = text.split("---").map((s) => s.trim()).filter(Boolean);
  if (scenes.length === 0) {
    return <pre className="kxd-os-ops-pre m-0 max-h-none">{text}</pre>;
  }

  return (
    <div className="flex flex-col gap-4">
      {scenes.map((scene, i) => (
        <KxdSurface key={i} variant="panel" className="p-4">
          <pre className="kxd-os-ops-pre m-0 max-h-none">{scene}</pre>
        </KxdSurface>
      ))}
    </div>
  );
}

// ── Caption options block ─────────────────────────────────────────────────────

function CaptionOptionsBlock({ text }: { text: string }) {
  const options = text.split("---").map((s) => s.trim()).filter(Boolean);
  const letters = ["A", "B", "C"];
  return (
    <div className="flex flex-col gap-3">
      {options.map((caption, i) => (
        <KxdSurface key={i} variant="panel" className="p-4">
          <p className="kxd-os-section__label mb-2">Option {letters[i] || i + 1}</p>
          <p className="kxd-os-body">{caption}</p>
        </KxdSurface>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReelDetailClient({ doc }: { doc: AnyDoc }) {
  const [screenshotState, setScreenshotState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [screenshotMsg, setScreenshotMsg] = useState<string | null>(null);
  const [storyboardState, setStoryboardState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [storyboardMsg, setStoryboardMsg] = useState<string | null>(null);
  const [renderState, setRenderState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [renderMsg, setRenderMsg] = useState<string | null>(null);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(doc.renderedVideoUrl || null);

  const screenshots: AnyDoc[] = Array.isArray(doc.capturedScreenshots) ? doc.capturedScreenshots : [];
  const shotCount = screenshotCount(doc);
  const hasStoryboard = doc.storyboardGenerationStatus === "complete" && doc.generatedScript;
  const hasScreenshots = doc.screenshotStatus === "complete" && shotCount > 0;
  const hasRender = (doc.renderStatus === "complete" && !!renderedUrl) || !!renderedUrl;

  async function captureScreenshots() {
    setScreenshotState("loading");
    setScreenshotMsg(null);
    try {
      const res = await fetch("/api/admin/reels/screenshot", {
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
      const res = await fetch("/api/admin/reels/storyboard", {
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

  async function renderReel(manifestOnly = false) {
    setRenderState("loading");
    setRenderMsg(null);
    try {
      const res = await fetch("/api/admin/reels/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reelRequestId: doc.id, manifestOnly }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.manifestOnly) {
          setRenderState("done");
          setRenderMsg("Render manifest generated. Check the console or Payload record for the CLI command.");
          console.log("[KXD Reel Manifest]", JSON.stringify(data.manifest, null, 2));
        } else {
          setRenderState("done");
          const url = data.renderedVideoUrl || data.servedUrl;
          setRenderedUrl(url);
          setRenderMsg(`MP4 rendered in ${Math.round(data.durationMs / 1000)}s — ${data.frameCount} frames. Refresh to confirm.`);
        }
      } else {
        setRenderState("error");
        setRenderMsg(data.error || "Render failed.");
      }
    } catch (err) {
      setRenderState("error");
      setRenderMsg(`Network error: ${String(err)}`);
    }
  }

  return (
    <OperationsShell activeId="reels">
      <KxdPage className="kxd-os-page--ops">
        <header className="kxd-os-ops-hero">
          <div className="kxd-os-ops-hero__top">
            <Link href="/admin/operations/reels" className="kxd-os-ops-hero__back">
              ← Reels
            </Link>
            <Link
              href={`/admin/collections/promo-video-requests/${doc.id}`}
              className="kxd-os-link-quiet"
            >
              Edit in Payload →
            </Link>
          </div>
          <OperationsPageHero
            eyebrow="KXD OS · Reel Detail"
            title={doc.videoTitle || "Untitled Reel"}
            lead="Screenshot capture, storyboard generation, and MP4 render for this website reel."
            presence
          />
        </header>

        {/* ── Brief summary ───────────────────────────────────────────────── */}
        <OpsCard className="mb-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="kxd-os-section__label">{clientName(doc)}</p>
              <h2 className="kxd-os-headline kxd-os-headline--presence mt-2">
                {doc.videoTitle || "Untitled Reel"}
              </h2>
              {doc.websiteUrl && (
                <a
                  href={doc.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kxd-os-ops-link-row--external kxd-os-ops-link-row--inline"
                >
                  {doc.websiteUrl} ↗
                </a>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <OpsStatusBadge
                label={(doc.status || "new").replace("-", " ")}
                variant={statusVariant(String(doc.status ?? "new"))}
              />
              {doc.platform && <OpsStatusBadge label={doc.platform} variant="default" />}
              {doc.visualStyle && <OpsStatusBadge label={doc.visualStyle} variant="default" />}
            </div>
          </div>
          {doc.goal && (
            <div className="mt-5 border-t border-white/[0.08] pt-4">
              <p className="kxd-os-section__label">Goal</p>
              <p className="kxd-os-body mt-2">{doc.goal}</p>
            </div>
          )}
        </OpsCard>

        {/* ── Action panel ────────────────────────────────────────────────── */}
        <div className="kxd-os-operations-columns">
          {/* Screenshot action */}
          <StepPanel label="Step 01 — Screenshot Capture" accent={!hasScreenshots}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="kxd-os-body mb-1">
                  {hasScreenshots ? `${shotCount} sections captured` : "No screenshots yet"}
                </p>
                <p className="kxd-os-meta">
                  Playwright captures hero, services, testimonials, CTA, and full-page sections.
                </p>
              </div>
              <OpsStatusBadge
                label={doc.screenshotStatus || "idle"}
                variant={pipelineStatusVariant(String(doc.screenshotStatus ?? "idle"))}
              />
            </div>
            {doc.websiteUrl ? (
              <KxdButton
                onClick={captureScreenshots}
                loading={screenshotState === "loading"}
                className="w-full"
              >
                {screenshotState === "loading"
                  ? "Capturing…"
                  : hasScreenshots
                    ? "Recapture Screenshots"
                    : "Capture Screenshots"}
              </KxdButton>
            ) : (
              <p className="kxd-os-ops-alert kxd-os-ops-alert--error">No website URL. Edit this record and add one.</p>
            )}
            {screenshotMsg && (
              <ActionFeedback message={screenshotMsg} isError={screenshotState === "error"} />
            )}
          </StepPanel>

          {/* Storyboard action */}
          <StepPanel label="Step 02 — Storyboard Generation" accent={hasScreenshots && !hasStoryboard}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="kxd-os-body mb-1">
                  {hasStoryboard ? "Storyboard complete" : "No storyboard yet"}
                </p>
                <p className="kxd-os-meta">
                  Brand-aware AI generation: hook, scene sequence, transitions, captions, CTA, and music direction.
                </p>
              </div>
              <OpsStatusBadge
                label={doc.storyboardGenerationStatus || "idle"}
                variant={pipelineStatusVariant(String(doc.storyboardGenerationStatus ?? "idle"))}
              />
            </div>
            <KxdButton
              onClick={generateStoryboard}
              loading={storyboardState === "loading"}
              className="w-full"
            >
              {storyboardState === "loading"
                ? "Generating…"
                : hasStoryboard
                  ? "Regenerate Storyboard"
                  : "Generate Storyboard"}
            </KxdButton>
            {storyboardMsg && (
              <ActionFeedback message={storyboardMsg} isError={storyboardState === "error"} />
            )}
          </StepPanel>

          {/* MP4 render action */}
          <StepPanel label="Step 03 — Generate MP4" accent={hasStoryboard && hasScreenshots && !hasRender}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="kxd-os-body mb-1">{hasRender ? "MP4 rendered" : "No render yet"}</p>
                <p className="kxd-os-meta">
                  Remotion renders screenshots + storyboard into a downloadable MP4 (local dev only — Phase 5C for cloud).
                </p>
              </div>
              <OpsStatusBadge
                label={
                  renderState === "loading"
                    ? "rendering"
                    : doc.renderStatus === "complete"
                      ? "complete"
                      : doc.renderStatus || "idle"
                }
                variant={pipelineStatusVariant(
                  String(doc.renderStatus ?? "idle"),
                  renderState === "loading" ? "loading" : renderState,
                )}
              />
            </div>

            <KxdButton
              onClick={() => renderReel(false)}
              loading={renderState === "loading"}
              disabled={!hasScreenshots}
              className="mb-2 w-full"
            >
              {renderState === "loading"
                ? "Rendering… (may take 1–2 min)"
                : hasRender
                  ? "Re-render MP4"
                  : "Generate MP4"}
            </KxdButton>

            <KxdButton
              variant="secondary"
              onClick={() => renderReel(true)}
              loading={renderState === "loading"}
              className="w-full"
            >
              Export Render Manifest (CLI)
            </KxdButton>

            {!hasScreenshots && (
              <p className="kxd-os-caption mt-2">Capture screenshots first to unlock rendering.</p>
            )}

            {renderMsg && <ActionFeedback message={renderMsg} isError={renderState === "error"} />}

            {doc.renderDurationMs && (
              <p className="kxd-os-caption mt-2">
                Last render: {Math.round(doc.renderDurationMs / 1000)}s · v{doc.renderVersion || 1}
              </p>
            )}
          </StepPanel>
        </div>

        {/* ── Download / preview rendered video ───────────────────────────── */}
        {renderedUrl && (
          <OpsCard className="mb-10">
            <OpsSectionHead label="Rendered MP4 — Ready to Download" />
            <div className="flex flex-wrap items-center gap-5">
              <div className="min-w-0 flex-1">
                <p className="kxd-os-ops-code truncate">{renderedUrl}</p>
                <p className="kxd-os-meta mt-1">
                  Served from public/generated-reels/ in local dev. Upload to CDN for production delivery.
                </p>
              </div>
              <div className="kxd-os-ops-workflow-actions shrink-0">
                <Link href={renderedUrl} target="_blank" rel="noopener noreferrer">
                  <KxdButton>View MP4 ↗</KxdButton>
                </Link>
                <a href={renderedUrl} download>
                  <KxdButton variant="secondary">Download</KxdButton>
                </a>
              </div>
            </div>
          </OpsCard>
        )}

        {/* ── Render error ─────────────────────────────────────────────────── */}
        {doc.renderError && doc.renderStatus === "failed" && (
          <div className="kxd-os-ops-alert kxd-os-ops-alert--error mb-10">
            <p className="kxd-os-section__label">Render Error</p>
            <p>{doc.renderError}</p>
            <p className="kxd-os-meta">
              Common fixes: ensure <code className="kxd-os-ops-footnote__code">npx playwright install chromium</code> has
              been run and the Next.js dev server is accessible at localhost:3000 during rendering.
            </p>
          </div>
        )}

        {/* ── Hook ────────────────────────────────────────────────────────── */}
        {doc.reelHook && (
          <OpsCard className="mb-10">
            <OpsSectionHead label="Reel Hook (0:00–0:03)" />
            <p className="kxd-os-headline kxd-os-headline--presence italic">
              &ldquo;{doc.reelHook}&rdquo;
            </p>
            {doc.reelTitle && (
              <p className="kxd-os-section__label mt-4">Reel Title: {doc.reelTitle}</p>
            )}
          </OpsCard>
        )}

        {/* ── Scene sequence ───────────────────────────────────────────────── */}
        {doc.sceneSequence && (
          <KxdSection className="kxd-os-ops-section">
            <OpsSectionHead label="Scene Sequence" />
            <OpsCard>
              <SceneSequenceBlock text={doc.sceneSequence} />
            </OpsCard>
          </KxdSection>
        )}

        {/* ── Two-col: transition style + CTA ─────────────────────────────── */}
        {(doc.transitionStyle || doc.ctaText) && (
          <div className="kxd-os-operations-split">
            {doc.transitionStyle && (
              <OpsCard>
                <OpsSectionHead label="Transition Style" />
                <p className="kxd-os-body">{doc.transitionStyle}</p>
              </OpsCard>
            )}
            {doc.ctaText && (
              <OpsCard>
                <OpsSectionHead label="CTA" />
                <p className="kxd-os-title">{doc.ctaText}</p>
              </OpsCard>
            )}
          </div>
        )}

        {/* ── Music direction ──────────────────────────────────────────────── */}
        {doc.musicDirection && (
          <KxdSection className="kxd-os-ops-section">
            <OpsSectionHead label="Music Direction" />
            <OpsCard>
              <p className="kxd-os-body">{doc.musicDirection}</p>
            </OpsCard>
          </KxdSection>
        )}

        {/* ── Caption options ──────────────────────────────────────────────── */}
        {doc.captionOptions && (
          <KxdSection className="kxd-os-ops-section">
            <OpsSectionHead label="Caption Options (A/B/C)" />
            <OpsCard>
              <CaptionOptionsBlock text={doc.captionOptions} />
            </OpsCard>
          </KxdSection>
        )}

        {/* ── Post copy (hook + hashtags) ──────────────────────────────────── */}
        {doc.generatedPostCopy && (
          <KxdSection className="kxd-os-ops-section">
            <OpsSectionHead label="Post Copy & Hashtags" />
            <OpsCard>
              <pre className="kxd-os-ops-pre m-0 max-h-none">{doc.generatedPostCopy}</pre>
            </OpsCard>
          </KxdSection>
        )}

        {/* ── Screenshots ──────────────────────────────────────────────────── */}
        {screenshots.length > 0 && (
          <KxdSection className="kxd-os-ops-section">
            <OpsSectionHead label="Captured Screenshots" count={screenshots.length} />
            <OpsCard>
              <ScreenshotGrid screenshots={screenshots} />
            </OpsCard>
          </KxdSection>
        )}

        {/* ── Full storyboard text ──────────────────────────────────────────── */}
        {doc.generatedScript && (
          <KxdSection className="kxd-os-ops-section">
            <OpsSectionHead label="Full Storyboard Output" />
            <OpsCard>
              <pre className="kxd-os-ops-pre m-0 max-h-[28rem]">{doc.generatedScript}</pre>
            </OpsCard>
          </KxdSection>
        )}

        {/* ── Generation error ─────────────────────────────────────────────── */}
        {doc.storyboardGenerationError && (
          <div className="kxd-os-ops-alert kxd-os-ops-alert--error mb-10">
            <p className="kxd-os-section__label">Generation Error</p>
            <p>{doc.storyboardGenerationError}</p>
          </div>
        )}

        {/* ── Footer links ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 border-t border-white/[0.08] pt-6">
          <Link href="/admin/operations/reels" className="kxd-os-link-quiet">
            ← All Reels
          </Link>
          <Link
            href={`/admin/collections/promo-video-requests/${doc.id}`}
            className="kxd-os-link-quiet"
          >
            Edit Full Record in Payload →
          </Link>
          <Link href="/admin/operations/reels/new" className="kxd-os-link-quiet">
            Create Another Reel
          </Link>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
