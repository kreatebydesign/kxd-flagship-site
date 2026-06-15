/**
 * /admin/operations/reels
 * KXD OS — Website Showcase Reel Generator
 * Phase 5A: URL → Screenshots → Reel Storyboard
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";

export const metadata: Metadata = {
  title: "Reel Generator · KXD OS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function statusColor(s: string): string {
  const map: Record<string, string> = {
    new:           "rgba(255,255,255,0.3)",
    storyboarding: C.gold,
    scripting:     C.gold,
    "assets-needed": "#a78bfa",
    editing:       "#60a5fa",
    review:        "#fb923c",
    approved:      C.green,
    delivered:     C.green,
    archived:      "rgba(255,255,255,0.18)",
  };
  return map[s] || "rgba(255,255,255,0.3)";
}

function screenshotStatusBadge(s: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    idle:      { label: "Not Captured",  color: "rgba(255,255,255,0.25)" },
    capturing: { label: "Capturing…",   color: C.gold },
    complete:  { label: "✓ Captured",   color: C.green },
    failed:    { label: "✗ Failed",     color: C.red },
  };
  return map[s] || map.idle;
}

function storyboardStatusBadge(s: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    idle:      { label: "Not Generated", color: "rgba(255,255,255,0.25)" },
    generating:{ label: "Generating…",  color: C.gold },
    complete:  { label: "✓ Generated",  color: C.green },
    failed:    { label: "✗ Failed",     color: C.red },
  };
  return map[s] || map.idle;
}

function platformLabel(p: string): string {
  const map: Record<string, string> = {
    "instagram-reel": "Instagram Reel",
    "facebook-reel":  "Facebook Reel",
    tiktok:           "TikTok",
    linkedin:         "LinkedIn",
    youtube:          "YouTube",
    website:          "Website",
    other:            "Other",
  };
  return map[p] || p || "—";
}

function styleLabel(s: string): string {
  const map: Record<string, string> = {
    cinematic:       "Cinematic",
    luxury:          "Luxury",
    editorial:       "Editorial",
    "launch-reveal": "Launch Reveal",
    "case-study":    "Case Study",
    energetic:       "Energetic",
    minimal:         "Minimal",
    bold:            "Bold",
    documentary:     "Documentary",
  };
  return map[s] || s || "—";
}

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

function Tag({ children, color = C.goldDim }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily:    C.sans,
      fontSize:      "0.4375rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      color,
      background:    "rgba(255,255,255,0.04)",
      border:        `1px solid rgba(255,255,255,0.07)`,
      padding:       "0.2rem 0.5rem",
      whiteSpace:    "nowrap" as const,
    }}>
      {children}
    </span>
  );
}

function ActionChip({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        fontFamily:    C.sans,
        fontSize:      "0.4375rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase" as const,
        color:         primary ? C.bgBase : C.goldDim,
        background:    primary
          ? "linear-gradient(180deg, #d1b06b 0%, #c5a65c 48%, #b09040 100%)"
          : "transparent",
        border:        primary ? "none" : `1px solid ${C.borderGold}`,
        padding:       "0.4375rem 0.875rem",
        textDecoration:"none",
        display:       "inline-block",
        whiteSpace:    "nowrap" as const,
      }}
    >
      {label}
    </Link>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "4rem 2rem", textAlign: "center", border: `1px dashed rgba(197,166,92,0.2)`, background: C.goldFaint }}>
      <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem", color: C.cream, marginBottom: "0.75rem" }}>
        No website reels yet.
      </p>
      <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginBottom: "2rem", maxWidth: "28rem", margin: "0 auto 2rem" }}>
        Enter a website URL to generate a premium reel storyboard with automated screenshots and AI-generated scene sequences.
      </p>
      <Link
        href="/admin/operations/reels/new"
        style={{
          fontFamily:    C.sans,
          fontWeight:    500,
          fontSize:      "0.5625rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color:         C.bgBase,
          background:    "linear-gradient(180deg, #d1b06b 0%, #c5a65c 48%, #b09040 100%)",
          padding:       "0.875rem 2rem",
          textDecoration:"none",
          display:       "inline-block",
        }}
      >
        Create First Reel
      </Link>
    </div>
  );
}

// ── Reel card ─────────────────────────────────────────────────────────────────

function ReelCard({ doc }: { doc: AnyDoc }) {
  const shotCount = screenshotCount(doc);
  const ssBadge   = screenshotStatusBadge(doc.screenshotStatus || "idle");
  const sbBadge   = storyboardStatusBadge(doc.storyboardGenerationStatus || "idle");
  const hasStoryboard = doc.storyboardGenerationStatus === "complete" && doc.generatedScript;

  return (
    <div style={{
      background:  C.bgElevated,
      border:      `1px solid ${C.border}`,
      padding:     "1.5rem",
      display:     "flex",
      flexDirection: "column" as const,
      gap:         "1rem",
    }}>
      {/* Top row: title + status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.375rem" }}>
            {clientName(doc)}
          </p>
          <p style={{
            fontFamily:   C.serif,
            fontWeight:   300,
            fontSize:     "1.125rem",
            color:        C.cream,
            lineHeight:   1.2,
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap" as const,
          }}>
            {doc.videoTitle || "Untitled Reel"}
          </p>
          {doc.websiteUrl && (
            <p style={{ fontFamily: "monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.25)", marginTop: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {doc.websiteUrl}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: "0.375rem", flexShrink: 0 }}>
          <span style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: statusColor(doc.status || "new") }}>
            {(doc.status || "new").replace("-", " ")}
          </span>
          <span style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.18)" }}>
            #{doc.id}
          </span>
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.375rem" }}>
        {doc.platform   && <Tag>{platformLabel(doc.platform)}</Tag>}
        {doc.visualStyle && <Tag>{styleLabel(doc.visualStyle)}</Tag>}
        {doc.durationTarget && <Tag>{doc.durationTarget}</Tag>}
        {doc.priority && doc.priority !== "normal" && (
          <Tag color={doc.priority === "urgent" ? C.red : doc.priority === "high" ? "#fb923c" : C.goldDim}>
            {doc.priority}
          </Tag>
        )}
      </div>

      {/* Pipeline status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, padding: "0.625rem 0.75rem" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.2)", marginBottom: "0.25rem" }}>
            Screenshots
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.625rem", color: ssBadge.color }}>
            {ssBadge.label}
          </p>
          {shotCount > 0 && (
            <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.25)", marginTop: "0.125rem" }}>
              {shotCount} section{shotCount !== 1 ? "s" : ""} captured
            </p>
          )}
          {doc.screenshotError && (
            <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: C.red, marginTop: "0.25rem", lineHeight: 1.4 }}>
              {String(doc.screenshotError).slice(0, 80)}
            </p>
          )}
        </div>
        <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, padding: "0.625rem 0.75rem" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.2)", marginBottom: "0.25rem" }}>
            Storyboard
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.625rem", color: sbBadge.color }}>
            {sbBadge.label}
          </p>
          {doc.storyboardGeneratedAt && (
            <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.25)", marginTop: "0.125rem" }}>
              {new Date(doc.storyboardGeneratedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Reel hook preview */}
      {doc.reelHook && (
        <div style={{ background: C.goldFaint, border: `1px solid ${C.borderGold}`, padding: "0.75rem 1rem" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.375rem" }}>
            Hook
          </p>
          <p style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "0.9375rem", color: C.cream, lineHeight: 1.3, fontStyle: "italic" }}>
            &ldquo;{doc.reelHook}&rdquo;
          </p>
        </div>
      )}

      {/* Scene sequence preview */}
      {hasStoryboard && doc.sceneSequence && (
        <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, padding: "0.75rem 1rem", maxHeight: "6rem", overflow: "hidden" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.2)", marginBottom: "0.375rem" }}>
            Scene Preview
          </p>
          <pre style={{ fontFamily: "monospace", fontSize: "0.4375rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6, whiteSpace: "pre-wrap" as const, margin: 0 }}>
            {String(doc.sceneSequence).slice(0, 240)}…
          </pre>
        </div>
      )}

      {/* Caption preview */}
      {doc.captionOptions && (
        <div>
          <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.18)", marginBottom: "0.375rem" }}>
            Caption A
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.625rem", color: C.creamMuted, lineHeight: 1.5 }}>
            {String(doc.captionOptions).split("---")[0].trim().slice(0, 160)}{String(doc.captionOptions).length > 160 ? "…" : ""}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const, paddingTop: "0.25rem", borderTop: `1px solid ${C.border}` }}>
        <ActionChip href={`/admin/operations/reels/${doc.id}`} label="View Storyboard" primary={hasStoryboard} />
        {!hasStoryboard && doc.websiteUrl && (
          <ActionChip href={`/admin/operations/reels/${doc.id}`} label="Generate Storyboard" primary />
        )}
        <ActionChip href={`/admin/collections/promo-video-requests/${doc.id}`} label="Edit in Payload" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ReelsDashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let docs: any[] = [];
  let totalDocs = 0;
  let counts = { total: 0, complete: 0, generating: 0, screenshotted: 0 };

  try {
    const payload = await getPayload({ config });
    const result  = await payload.find({
      collection: "promo-video-requests" as "clients",
      where: { isWebsiteReel: { equals: true } },
      limit: 100,
      depth: 1,
      sort: "-createdAt",
    });
    docs      = result.docs;
    totalDocs = result.totalDocs;
    counts = {
      total:        totalDocs,
      complete:     docs.filter(d => d.storyboardGenerationStatus === "complete").length,
      generating:   docs.filter(d => d.storyboardGenerationStatus === "generating").length,
      screenshotted:docs.filter(d => d.screenshotStatus === "complete").length,
    };
  } catch { /* Payload unavailable — show empty state */ }

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "1.25rem", borderBottom: `1px solid ${C.borderGold}`, position: "sticky", top: 0, zIndex: 50, background: C.bgBase }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <KxdLogo />
            <div>
              <p style={{ color: C.goldDim, fontSize: "0.5rem", letterSpacing: "0.1em" }}>KXD OS · Phase 5A</p>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.cream }}>Reel Generator</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            <Link href="/admin/operations/creative" style={{ color: C.goldDim, fontSize: "0.5rem", letterSpacing: "0.1em", textDecoration: "none" }}>
              ← Creative Engine
            </Link>
            <Link href="/admin/operations" style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.5rem", letterSpacing: "0.1em", textDecoration: "none" }}>
              Operations
            </Link>
            <Link
              href="/admin/operations/reels/new"
              style={{
                fontFamily:    C.sans,
                fontWeight:    500,
                fontSize:      "0.5rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
                color:         C.bgBase,
                background:    "linear-gradient(180deg, #d1b06b 0%, #c5a65c 48%, #b09040 100%)",
                padding:       "0.5625rem 1.25rem",
                textDecoration:"none",
              }}
            >
              + New Reel
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: "2rem" }}>

        {/* ── Phase label + description ───────────────────────────────────── */}
        <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.625rem" }}>
            KXD OS · Phase 5A · Website Showcase Reel Generator
          </p>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: C.cream, lineHeight: 1.1, letterSpacing: "-0.01em", marginBottom: "0.75rem" }}>
            Website Showcase Reels
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)", maxWidth: "44rem", lineHeight: 1.6 }}>
            Generate premium reel storyboards from website URLs. Automated Playwright screenshot capture → brand-aware AI storyboard → production-ready scene sequence.
          </p>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: C.border, marginBottom: "2rem" }}>
          {[
            { label: "Total Reels",      value: counts.total },
            { label: "Screenshotted",    value: counts.screenshotted },
            { label: "Storyboards Done", value: counts.complete },
            { label: "In Progress",      value: counts.generating },
          ].map((kpi, i) => (
            <div key={i} style={{ background: C.bgElevated, padding: "1.125rem 1.25rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.375rem" }}>
                {kpi.label}
              </p>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.75rem", color: C.cream }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Pipeline guide ──────────────────────────────────────────────── */}
        <div style={{ background: C.goldFaint, border: `1px solid ${C.borderGold}`, padding: "1.25rem", marginBottom: "2rem" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.875rem" }}>
            Reel Generation Pipeline
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1px", background: C.border }}>
            {[
              { step: "01", label: "Create Request",    detail: "Enter URL + client + style",           endpoint: null },
              { step: "02", label: "Capture Screenshots",detail: "POST /api/admin/reels/screenshot",    endpoint: "/api/admin/reels/screenshot" },
              { step: "03", label: "Generate Storyboard",detail: "POST /api/admin/reels/storyboard",   endpoint: "/api/admin/reels/storyboard" },
              { step: "04", label: "Review & Deliver",   detail: "Approve storyboard, export to editor", endpoint: null },
            ].map((s, i) => (
              <div key={i} style={{ background: C.bgBase, padding: "1rem" }}>
                <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.2em", color: C.goldDim, marginBottom: "0.375rem" }}>
                  {s.step}
                </p>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5625rem", color: C.cream, marginBottom: "0.25rem" }}>
                  {s.label}
                </p>
                {s.endpoint ? (
                  <p style={{ fontFamily: "monospace", fontSize: "0.4375rem", color: "rgba(197,166,92,0.5)" }}>
                    {s.endpoint}
                  </p>
                ) : (
                  <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.2)" }}>
                    {s.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.18)", marginTop: "0.875rem" }}>
            Set OPENAI_API_KEY to enable storyboard generation. Run <code style={{ fontFamily: "monospace", color: C.goldDim }}>npx playwright install chromium</code> to enable screenshot capture.
          </p>
        </div>

        {/* ── Reel list ───────────────────────────────────────────────────── */}
        {docs.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1rem" }}>
            {docs.map((doc: AnyDoc) => <ReelCard key={doc.id} doc={doc} />)}
          </div>
        )}

      </div>
    </div>
  );
}
