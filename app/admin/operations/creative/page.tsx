/**
 * /admin/operations/creative
 * KXD Creative Engine — Creative Operations
 *
 * Phase 3C: Creative Intelligence Layer integrated.
 * Intelligence section runs in parallel with existing data loads via
 * Promise.allSettled. All three intelligence calls fail-safe — the page
 * never crashes on partial failures.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";
import {
  getCreativeSystemHealth,
  getCampaignHealthScores,
  getOrphanedCreativeItems,
  type CreativeSystemHealth,
  type CampaignHealthScore,
  type OrphanedCreativeItems,
} from "@/lib/creative-intelligence";

export const metadata: Metadata = {
  title: "Creative Engine · KXD OS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// ── Brand tokens ──────────────────────────────────────────────────────────────

const C = {
  bgBase:     "#080808",
  bgPure:     "#000",
  bgElevated: "#0B0B0B",
  gold:       "#C9A962",
  goldDim:    "rgba(201,169,98,0.55)",
  goldFaint:  "rgba(255,255,255,0.035)",
  cream:      "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  border:     "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  red:        "#d25a5a",
  sans:       "var(--font-outfit, Inter, system-ui)",
  serif:      "var(--font-cormorant, Georgia)",
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const num = (v: any) => (v ?? 0).toString();

type PriorityItem = {
  label:    string;
  client?:  string;
  status?:  string;
  priority?: string;
};

function buildPriorityQueue(data: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaigns: any[]; flyers: any[]; videos: any[]; social: any[];
}): PriorityItem[] {
  const all: PriorityItem[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const push = (arr: any[]) => arr.forEach(x => all.push({
    label:    x.campaignTitle || x.flyerTitle || x.videoTitle || x.postTitle || "Untitled",
    client:   x.client?.name || "Client",
    status:   x.status,
    priority: x.priority,
  }));
  push(data.campaigns); push(data.flyers); push(data.videos); push(data.social);
  return all
    .sort((a, b) => {
      const s = (p?: string) => p === "urgent" ? 3 : p === "high" ? 2 : p === "normal" ? 1 : 0;
      return s(b.priority) - s(a.priority);
    })
    .slice(0, 5);
}

// ── Existing sub-components ───────────────────────────────────────────────────

function Metric({ label, value, highlight, danger }: {
  label: string; value: number; highlight?: boolean; danger?: boolean;
}) {
  return (
    <div>
      <p style={{ fontSize: "0.55rem", color: C.goldDim }}>{label}</p>
      <p style={{ fontSize: "1.5rem", color: danger ? C.red : highlight ? C.gold : C.cream }}>{value}</p>
    </div>
  );
}

function HealthSignal({ items }: { items: PriorityItem[] }) {
  const urgent  = items.filter(i => i.priority === "urgent").length;
  const blocked = items.filter(i => i.status === "blocked").length;
  return (
    <div style={{ marginBottom: "2rem", padding: "1.25rem", border: `1px solid ${C.borderGold}`, background: C.bgElevated }}>
      <p style={{ fontSize: "0.55rem", letterSpacing: "0.16em", color: C.goldDim, textTransform: "uppercase" as const }}>
        Creative Health Signals
      </p>
      <div style={{ display: "flex", gap: "2rem", marginTop: "1rem" }}>
        <Metric label="Priority Items" value={items.length} />
        <Metric label="Urgent"         value={urgent}       highlight />
        <Metric label="Blocked"        value={blocked}      danger />
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function KpiCard({ label, value }: any) {
  return (
    <div style={{ border: `1px solid ${C.border}`, padding: "1rem" }}>
      <p style={{ fontSize: "0.55rem", color: C.goldDim }}>{label}</p>
      <p style={{ fontSize: "1.5rem" }}>{value}</p>
    </div>
  );
}

// ── Intelligence UI components ────────────────────────────────────────────────

function IntelLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: C.sans,
      fontSize: "0.6875rem",
      letterSpacing: "0.16em",
      textTransform: "uppercase" as const,
      color: C.goldDim,
      marginBottom: "1rem",
    }}>
      {children}
    </p>
  );
}

function IntelCard({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background:  accent ? C.goldFaint : C.bgElevated,
      border:      `1px solid ${accent ? C.borderGold : C.border}`,
      padding:     "1.25rem",
      height:      "100%",
    }}>
      {children}
    </div>
  );
}

/** 1. System Health Snapshot */
function SystemHealthBlock({ health }: { health: CreativeSystemHealth }) {
  const metrics: Array<{ label: string; value: number; alert?: boolean }> = [
    { label: "Active Campaigns",  value: health.activeCampaigns },
    { label: "Total Requests",    value: health.totalRequests },
    { label: "Stalled Items",     value: health.stalledItems,    alert: health.stalledItems > 0 },
    { label: "Orphaned Assets",   value: health.orphanedAssets,  alert: health.orphanedAssets > 0 },
    { label: "Missing Brand Kits",value: health.missingBrandKits,alert: health.missingBrandKits > 0 },
  ];

  return (
    <IntelCard>
      <IntelLabel>System Health Snapshot</IntelLabel>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.625rem" }}>
        {metrics.map(m => (
          <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4375rem 0", borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.creamMuted }}>{m.label}</p>
            <p style={{
              fontFamily: C.sans,
              fontSize:   "0.875rem",
              fontWeight: 500,
              color:      m.alert && m.value > 0 ? C.red : m.value > 0 ? C.gold : "rgba(255,255,255,0.25)",
            }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </IntelCard>
  );
}

/** 2. Top 5 Campaigns by Health Score */
function CampaignScoresBlock({ scores }: { scores: CampaignHealthScore[] }) {
  const top5 = scores.slice(0, 5);

  function scoreColor(s: number) {
    if (s >= 80) return C.gold;
    if (s >= 50) return C.creamMuted;
    return C.red;
  }

  function scoreBar(s: number) {
    const pct = `${s}%`;
    const bg  = s >= 80 ? C.gold : s >= 50 ? "rgba(201,169,98,0.35)" : C.red;
    return (
      <div style={{ height: "2px", background: C.border, marginTop: "0.25rem", width: "100%" }}>
        <div style={{ height: "100%", width: pct, background: bg, transition: "none" }} />
      </div>
    );
  }

  return (
    <IntelCard>
      <IntelLabel>Campaign Health Scores</IntelLabel>
      {top5.length === 0
        ? <p style={{ fontFamily: C.sans, fontSize: "0.625rem", color: "rgba(255,255,255,0.22)" }}>No active campaigns.</p>
        : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
            {top5.map(c => (
              <div key={c.campaignId}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.cream, maxWidth: "75%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {c.title}
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600, color: scoreColor(c.score) }}>
                    {c.score}
                  </p>
                </div>
                {scoreBar(c.score)}
              </div>
            ))}
          </div>
        )
      }
    </IntelCard>
  );
}

/** 3. Orphaned Items Summary */
function OrphanedItemsBlock({ orphaned }: { orphaned: OrphanedCreativeItems }) {
  const rows = [
    { label: "Flyers without campaign",       value: orphaned.flyers.length },
    { label: "Videos without campaign",       value: orphaned.videos.length },
    { label: "Social posts without campaign", value: orphaned.socialPosts.length },
    { label: "Assets without campaign",       value: orphaned.assets.length },
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <IntelCard accent={total > 0}>
      <IntelLabel>Orphaned Items</IntelLabel>
      {total === 0
        ? <p style={{ fontFamily: C.sans, fontSize: "0.625rem", color: C.gold }}>✓ No orphaned items.</p>
        : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
            {rows.map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.375rem 0", borderBottom: `1px solid ${C.border}` }}>
                <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.creamMuted }}>{r.label}</p>
                <p style={{
                  fontFamily: C.sans,
                  fontSize:   "0.875rem",
                  fontWeight: 500,
                  color:      r.value > 0 ? C.red : "rgba(255,255,255,0.25)",
                }}>
                  {r.value}
                </p>
              </div>
            ))}
            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.2)", marginTop: "0.375rem" }}>
              Link these items to a campaign in Payload to resolve.
            </p>
          </div>
        )
      }
    </IntelCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Page() {
  // ── Existing operational data ─────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let campaigns: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let flyers:    any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let videos:    any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let social:    any[] = [];
  let campaignCount = 0, flyerCount = 0, videoCount = 0, socialCount = 0, assetCount = 0;

  try {
    const payload = await getPayload({ config });
    const [c, f, v, s, a] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "creative-campaigns"   as any, limit: 20 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "flyer-requests"       as any, limit: 20 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "promo-video-requests" as any, limit: 20 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "social-post-requests" as any, limit: 20 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "creative-assets"      as any, limit: 1  }),
    ]);
    if (c.status === "fulfilled") { campaigns = c.value.docs; campaignCount = c.value.totalDocs; }
    if (f.status === "fulfilled") { flyers    = f.value.docs; flyerCount    = f.value.totalDocs; }
    if (v.status === "fulfilled") { videos    = v.value.docs; videoCount    = v.value.totalDocs; }
    if (s.status === "fulfilled") { social    = s.value.docs; socialCount   = s.value.totalDocs; }
    if (a.status === "fulfilled") { assetCount = a.value.totalDocs; }
  } catch {}

  const priorityQueue = buildPriorityQueue({ campaigns, flyers, videos, social });

  // ── Intelligence layer — parallel, fully fail-safe ────────────────────────

  const defaultHealth: CreativeSystemHealth = {
    activeCampaigns: 0, totalRequests: 0, stalledItems: 0,
    completedItems: 0, orphanedAssets: 0, missingBrandKits: 0,
  };
  const defaultOrphaned: OrphanedCreativeItems = { flyers: [], videos: [], socialPosts: [], assets: [] };

  const [healthR, scoresR, orphanedR] = await Promise.allSettled([
    getCreativeSystemHealth(),
    getCampaignHealthScores(),
    getOrphanedCreativeItems(),
  ]);

  const health   = healthR.status   === "fulfilled" ? healthR.value   : defaultHealth;
  const scores   = scoresR.status   === "fulfilled" ? scoresR.value   : [];
  const orphaned = orphanedR.status === "fulfilled" ? orphanedR.value : defaultOrphaned;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "1.25rem", borderBottom: `1px solid ${C.borderGold}` }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <KxdLogo />
            <div>
              <p style={{ color: C.goldDim, fontSize: "0.6rem" }}>Creative Engine</p>
              <p style={{ fontSize: "0.7rem", opacity: 0.5 }}>Creative Operations Platform</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link href="/admin/operations/executive" style={{ color: C.goldDim, fontSize: "0.6rem", textDecoration: "none" }}>
              ← Operations
            </Link>
            <Link href="/admin/operations/accounts" style={{ color: "#C4B0D8", fontSize: "0.6rem", textDecoration: "none", opacity: 0.8 }}>
              Accounts →
            </Link>
            <Link href="/admin/operations/founder" style={{ color: "#C9A962", fontSize: "0.6rem", textDecoration: "none", opacity: 0.8 }}>
              Founder →
            </Link>
            <Link href="/admin/operations/reels" style={{ color: "#C9A962", fontSize: "0.6rem", textDecoration: "none", opacity: 0.8, background: "rgba(201,169,98,0.1)", border: "1px solid rgba(201,169,98,0.20)", padding: "0.25rem 0.625rem" }}>
              Reels →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: "2rem" }}>

        {/* ── Creative Intelligence section ───────────────────────────────── */}
        <div style={{ marginBottom: "2.5rem" }}>

          {/* Section header */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.375rem" }}>
                KXD OS · Phase 3C
              </p>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.375rem", color: C.cream, letterSpacing: "-0.01em" }}>
                Creative Intelligence
              </p>
            </div>
            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.18)", textTransform: "uppercase" as const }}>
              Live · Read-only
            </p>
          </div>

          {/* Three intelligence panels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <SystemHealthBlock  health={health}     />
            <CampaignScoresBlock scores={scores}    />
            <OrphanedItemsBlock orphaned={orphaned} />
          </div>

        </div>

        {/* ── Existing health signal ──────────────────────────────────────── */}
        <HealthSignal items={priorityQueue} />

        {/* ── KPI strip ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <KpiCard label="Campaigns" value={campaignCount} />
          <KpiCard label="Flyers"    value={flyerCount}    />
          <KpiCard label="Videos"    value={videoCount}    />
          <KpiCard label="Social"    value={socialCount}   />
          <KpiCard label="Assets"    value={assetCount}    />
        </div>

        {/* ── Phase 4A — Generation Actions ───────────────────────────────── */}
        <div style={{ marginBottom: "2rem", padding: "1.125rem 1.25rem", background: "rgba(201,169,98,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div>
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: C.goldDim }}>
                KXD OS · Phase 4A
              </p>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.cream, marginTop: "0.25rem" }}>
                Creative Production Engine
              </p>
            </div>
            <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" as const }}>
              Brand-Aware Generation
            </p>
          </div>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Generate brand-aware flyer creative direction and social post copy from any Payload request record.
            Open a request in Payload Admin, copy its numeric ID, then call the generation endpoint.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1px", background: "rgba(255,255,255,0.08)" }}>
            {[
              {
                label:    "Flyer Generator",
                endpoint: "POST /api/admin/creative/flyers/generate",
                body:     '{ "flyerRequestId": <id> }',
                href:     "/admin/collections/flyer-requests",
                linkText: "Open Flyer Requests →",
              },
              {
                label:    "Social Post Generator",
                endpoint: "POST /api/admin/creative/social/generate",
                body:     '{ "socialPostRequestId": <id> }',
                href:     "/admin/collections/social-post-requests",
                linkText: "Open Social Post Requests →",
              },
            ].map(action => (
              <div key={action.label} style={{ background: "#0B0B0B", padding: "1rem 1.125rem" }}>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", color: C.cream, marginBottom: "0.375rem" }}>
                  {action.label}
                </p>
                <p style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "rgba(201,169,98,0.6)", marginBottom: "0.25rem" }}>
                  {action.endpoint}
                </p>
                <p style={{ fontFamily: "monospace", fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>
                  {action.body}
                </p>
                <Link href={action.href} style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.goldDim, textDecoration: "none" }}>
                  {action.linkText}
                </Link>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: "rgba(255,255,255,0.18)", marginTop: "0.75rem", letterSpacing: "0.06em" }}>
            Set OPENAI_API_KEY in environment to enable AI generation. Without the key, routes return the assembled prompt only (prompt-only mode for testing).
          </p>
        </div>

        {/* ── Phase 5A — Reel Generator ───────────────────────────────────── */}
        <div style={{ marginBottom: "2rem", padding: "1.125rem 1.25rem", background: "rgba(201,169,98,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div>
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: C.goldDim }}>
                KXD OS · Phase 5A
              </p>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.cream, marginTop: "0.25rem" }}>
                Website Showcase Reel Generator
              </p>
            </div>
            <Link href="/admin/operations/reels" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.bgBase, background: `linear-gradient(180deg, #d1b06b 0%, #c9a962 48%, #b09040 100%)`, padding: "0.5rem 1.125rem", textDecoration: "none" }}>
              Open Reel Generator →
            </Link>
          </div>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.875rem", lineHeight: 1.6 }}>
            Generate premium website highlight reel storyboards from any website URL. Playwright captures hero, services, testimonials, and CTA sections. OpenAI generates a production-ready scene sequence with hook, timing, transitions, captions, and music direction.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1px", background: "rgba(255,255,255,0.08)" }}>
            {[
              { label: "Screenshot Capture",    endpoint: "POST /api/admin/reels/screenshot",  body: '{ "promoVideoRequestId": <id> }' },
              { label: "Storyboard Generation", endpoint: "POST /api/admin/reels/storyboard",  body: '{ "promoVideoRequestId": <id> }' },
            ].map(action => (
              <div key={action.label} style={{ background: "#0B0B0B", padding: "1rem 1.125rem" }}>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", color: C.cream, marginBottom: "0.375rem" }}>
                  {action.label}
                </p>
                <p style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "rgba(201,169,98,0.6)", marginBottom: "0.25rem" }}>
                  {action.endpoint}
                </p>
                <p style={{ fontFamily: "monospace", fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)" }}>
                  {action.body}
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: "rgba(255,255,255,0.18)", marginTop: "0.75rem", letterSpacing: "0.06em" }}>
            Requires: OPENAI_API_KEY · npx playwright install chromium · No MP4 rendering — storyboard MVP only.
          </p>
        </div>

        {/* ── Priority queue ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.6rem", color: C.goldDim, marginBottom: "1rem" }}>Top Priority Queue</p>
          {priorityQueue.map((i, idx) => (
            <div key={idx} style={{ padding: "0.75rem", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.8rem" }}>{i.label}</p>
                <p style={{ fontSize: "0.55rem", opacity: 0.4 }}>{i.client}</p>
              </div>
              <span style={{ color: C.goldDim, fontSize: "0.6rem" }}>{i.priority || "normal"}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
