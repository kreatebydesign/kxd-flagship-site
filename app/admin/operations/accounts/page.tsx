/**
 * /admin/operations/accounts
 * KXD OS — Strategic Accounts Intelligence
 * Phase 3A
 *
 * Identifies expansion opportunities within existing high-value clients,
 * surfaces revenue concentration risk, renewal watch, and founder attention
 * priorities across the entire account base.
 *
 * Architecture:
 *   — export const dynamic = "force-dynamic"  (live on every request)
 *   — 5 parallel Payload queries via Promise.allSettled
 *   — Full graceful degradation: any failed query returns an empty section
 *   — No writes, no mutations, no schema changes required
 *   — Self-contained styling: C tokens, inline styles, Tailwind layout classes
 */

import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";

export const dynamic = "force-dynamic";

// ── Brand tokens ──────────────────────────────────────────────────────────────

const C = {
  bgPure:      "#000000",
  bgBase:      "#080808",
  bgElevated:  "#111111",
  bgCard:      "#141414",
  gold:        "#C5A65C",
  goldDim:     "rgba(197,166,92,0.55)",
  goldFaint:   "rgba(197,166,92,0.08)",
  cream:       "#f8f3ea",
  creamMuted:  "#bfb7aa",
  red:         "#d25a5a",
  redFaint:    "rgba(210,90,90,0.08)",
  redBorder:   "rgba(210,90,90,0.25)",
  yellow:      "#f0be50",
  yellowFaint: "rgba(240,190,80,0.08)",
  green:       "#5ec68c",
  greenFaint:  "rgba(94,198,140,0.07)",
  greenBorder: "rgba(94,198,140,0.25)",
  teal:        "#96d2c8",
  tealFaint:   "rgba(150,210,200,0.07)",
  blue:        "#8a9bd2",
  blueFaint:   "rgba(138,155,210,0.07)",
  purple:      "#b48cdc",
  purpleFaint: "rgba(180,140,220,0.07)",
  border:      "rgba(255,255,255,0.07)",
  borderGold:  "rgba(197,166,92,0.22)",
  serif:       "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans:        "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / 86_400_000);
  } catch { return null; }
}

function clientName(raw: unknown): string {
  if (!raw) return "Unknown";
  if (typeof raw === "object" && raw !== null && "name" in raw)
    return (raw as AnyDoc).name as string || "Unknown";
  return "Unknown";
}

function clientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null && "id" in raw)
    return (raw as AnyDoc).id as number;
  if (typeof raw === "number") return raw;
  return null;
}

// ── Tier ordering ─────────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = {
  flagship: 4, growth: 3, maintenance: 2, internal: 1,
};
const TIER_COLOR: Record<string, string> = {
  flagship:    C.gold,
  growth:      C.teal,
  maintenance: C.creamMuted,
  internal:    "rgba(255,255,255,0.25)",
};
const TIER_LABEL: Record<string, string> = {
  flagship: "Flagship", growth: "Growth", maintenance: "Maintenance", internal: "Internal",
};
const STATUS_COLOR: Record<string, string> = {
  healthy:         C.green,
  "needs-attention": C.yellow,
  "at-risk":       C.red,
  paused:          C.creamMuted,
};
const STATUS_LABEL: Record<string, string> = {
  healthy:           "Healthy",
  "needs-attention": "Needs Attention",
  "at-risk":         "At Risk",
  paused:            "Paused",
};

// ── Primitive UI components ───────────────────────────────────────────────────

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: C.sans, fontSize: "0.4375rem", fontWeight: 600,
      letterSpacing: "0.18em", textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.3)", ...style,
    }}>
      {children}
    </p>
  );
}

function SectionHeader({
  label, sub, href, linkText,
}: {
  label: string; sub?: string; href?: string; linkText?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      marginBottom: "1.125rem", paddingBottom: "0.75rem",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div>
        <Label style={{ marginBottom: "0.375rem" }}>{label}</Label>
        {sub && (
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, letterSpacing: "0.02em" }}>
            {sub}
          </p>
        )}
      </div>
      {href && (
        <Link href={href} style={{
          fontFamily: C.sans, fontWeight: 500, fontSize: "0.4375rem",
          letterSpacing: "0.14em", textTransform: "uppercase" as const,
          color: C.goldDim, textDecoration: "none",
        }}>
          {linkText ?? "View →"}
        </Link>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      background: C.bgElevated, border: `1px solid ${C.border}`,
      padding: "1.375rem 1.5rem", display: "flex", alignItems: "center", gap: "0.875rem",
    }}>
      <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
      <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}>
        {message}
      </p>
    </div>
  );
}

function Badge({ children, color = C.creamMuted }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily: C.sans, fontWeight: 600, fontSize: "0.375rem",
      letterSpacing: "0.16em", textTransform: "uppercase" as const,
      color, border: `1px solid ${color}`, opacity: 0.8,
      padding: "0.125rem 0.5rem", whiteSpace: "nowrap" as const,
    }}>
      {children}
    </span>
  );
}

// ── Score calculation ─────────────────────────────────────────────────────────

interface AccountScore {
  clientId:         number;
  name:             string;
  tier:             string;
  status:           string;
  mrr:              number;
  score:            number;          // 0-100
  grade:            "A" | "B" | "C" | "D";
  gradeColor:       string;
  flags:            string[];
  strengths:        string[];
  nextAction:       string | null;
  nextActionDue:    string | null;
  retainerCount:    number;
  requestCount:     number;
  projectCount:     number;
  renewalDate:      string | null;
  billingStatus:    string | null;
  hasAutoRenew:     boolean;
}

function scoreAccount(
  client:   AnyDoc,
  retainers: AnyDoc[],
  requests:  AnyDoc[],
  projects:  AnyDoc[],
): AccountScore {
  const cid    = client.id as number;
  const name   = (client.name as string) || "Unknown";
  const tier   = (client.brandTier as string) || "maintenance";
  const status = (client.relationshipStatus as string) || "healthy";
  const mrr    = (client.monthlyRetainerAmount as number) || 0;

  const clientRetainers = retainers.filter(r => clientId(r.client) === cid);
  const clientRequests  = requests.filter(r => clientId(r.client) === cid);
  const clientProjects  = projects.filter(p => clientId(p.client) === cid);

  const activeRetainer = clientRetainers.find(r =>
    r.billingStatus === "active" || r.billingStatus === "pending"
  );
  const renewalDate  = activeRetainer?.renewalDate ?? null;
  const billingStatus = activeRetainer?.billingStatus ?? null;
  const hasAutoRenew = Boolean(activeRetainer?.autoRenew);

  // Score components (100 pts total)
  let s = 0;
  const flags: string[]     = [];
  const strengths: string[] = [];

  // Tier (25 pts)
  s += (TIER_RANK[tier] ?? 1) * 6;

  // MRR (20 pts)
  if (mrr >= 10_000) { s += 20; strengths.push("High MRR"); }
  else if (mrr >= 5_000) { s += 14; }
  else if (mrr >= 2_500) { s += 8; }
  else if (mrr > 0) { s += 3; }
  else { flags.push("No active retainer"); }

  // Relationship health (20 pts)
  if (status === "healthy")           { s += 20; strengths.push("Healthy relationship"); }
  else if (status === "needs-attention") { s += 10; flags.push("Relationship needs attention"); }
  else if (status === "at-risk")      { s += 0;  flags.push("Relationship at risk"); }
  else if (status === "paused")       { s += 5; }

  // Active projects (15 pts)
  const activeProjects = clientProjects.filter(p =>
    ["active", "in-progress", "review", "launch-ready"].includes(p.status)
  );
  if (activeProjects.length >= 2) { s += 15; strengths.push("Multiple active projects"); }
  else if (activeProjects.length === 1) { s += 8; }
  else { flags.push("No active projects"); }

  // Request volume — engagement signal (10 pts)
  const recentReqs = clientRequests.filter(r => {
    if (!r.createdAt) return false;
    return Date.now() - new Date(r.createdAt).getTime() < 90 * 86_400_000;
  });
  if (recentReqs.length >= 3) { s += 10; strengths.push("High engagement"); }
  else if (recentReqs.length >= 1) { s += 5; }

  // Next action defined (10 pts)
  if (client.nextAction) { s += 10; }
  else { flags.push("No next action set"); }

  // Billing health
  if (activeRetainer?.billingStatus === "overdue") flags.push("Billing overdue");

  const clamped = Math.min(s, 100);
  const grade: "A" | "B" | "C" | "D" =
    clamped >= 80 ? "A" : clamped >= 60 ? "B" : clamped >= 40 ? "C" : "D";
  const gradeColor =
    grade === "A" ? C.green : grade === "B" ? C.teal : grade === "C" ? C.yellow : C.red;

  return {
    clientId:      cid,
    name,
    tier,
    status,
    mrr,
    score:         clamped,
    grade,
    gradeColor,
    flags,
    strengths,
    nextAction:    (client.nextAction as string) ?? null,
    nextActionDue: (client.nextActionDueDate as string) ?? null,
    retainerCount: clientRetainers.length,
    requestCount:  clientRequests.length,
    projectCount:  clientProjects.length,
    renewalDate:   renewalDate as string | null,
    billingStatus: billingStatus as string | null,
    hasAutoRenew,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AccountsPage() {
  const payload = await getPayload({ config });

  const now        = new Date();
  const dateDisplay = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeDisplay = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // ── 5 parallel queries ──────────────────────────────────────────────────────

  const [clientsR, retainersR, projectsR, requestsR, deliverablesR] =
    await Promise.allSettled([
      payload.find({
        collection: "clients",
        limit:      200,
        depth:      0,
        where:      { status: { not_equals: "archived" } },
      }),
      payload.find({
        collection: "retainers",
        limit:      200,
        depth:      1,
      }),
      payload.find({
        collection: "client-projects",
        limit:      500,
        depth:      1,
      }),
      payload.find({
        collection: "client-requests",
        limit:      500,
        depth:      1,
      }),
      payload.find({
        collection: "monthly-deliverables",
        limit:      500,
        depth:      1,
      }),
    ]);

  const clients:      AnyDoc[] = clientsR.status      === "fulfilled" ? clientsR.value.docs      as AnyDoc[] : [];
  const retainers:    AnyDoc[] = retainersR.status    === "fulfilled" ? retainersR.value.docs    as AnyDoc[] : [];
  const projects:     AnyDoc[] = projectsR.status     === "fulfilled" ? projectsR.value.docs     as AnyDoc[] : [];
  const requests:     AnyDoc[] = requestsR.status     === "fulfilled" ? requestsR.value.docs     as AnyDoc[] : [];
  const deliverables: AnyDoc[] = deliverablesR.status === "fulfilled" ? deliverablesR.value.docs as AnyDoc[] : [];

  // ── Compute account scores ─────────────────────────────────────────────────

  const activeClients = clients.filter(c => c.status === "active");
  const allScores     = activeClients.map(c => scoreAccount(c, retainers, requests, projects));
  const sortedScores  = [...allScores].sort((a, b) => b.score - a.score);

  // ── MRR & revenue concentration ────────────────────────────────────────────

  const totalMRR     = allScores.reduce((s, a) => s + a.mrr, 0);
  const activeWithMRR = allScores.filter(a => a.mrr > 0).sort((a, b) => b.mrr - a.mrr);
  const top1MRR      = activeWithMRR[0]?.mrr ?? 0;
  const top3MRR      = activeWithMRR.slice(0, 3).reduce((s, a) => s + a.mrr, 0);
  const top1Pct      = totalMRR > 0 ? Math.round((top1MRR / totalMRR) * 100) : 0;
  const top3Pct      = totalMRR > 0 ? Math.round((top3MRR / totalMRR) * 100) : 0;

  const concRisk: "high" | "medium" | "low" =
    top1Pct >= 40 ? "high" : top1Pct >= 25 ? "medium" : "low";
  const concColor =
    concRisk === "high" ? C.red : concRisk === "medium" ? C.yellow : C.green;

  // ── Expansion opportunities ────────────────────────────────────────────────
  // Clients with no active projects (white space) but active retainer (could expand)

  const expansionCandidates = allScores.filter(a => {
    const hasRetainer = a.mrr > 0;
    const hasGap      = a.projectCount === 0 || a.retainerCount === 0;
    return hasRetainer && hasGap;
  });

  // White space: active clients with MRR but no projects in last 90d
  const whiteSpace = activeClients.filter(c => {
    const cid     = c.id as number;
    const hasMRR  = (c.monthlyRetainerAmount as number) > 0;
    const hasProj = projects.some(p => clientId(p.client) === cid &&
      ["active", "in-progress", "review", "launch-ready"].includes(p.status));
    return hasMRR && !hasProj;
  });

  // ── Founder attention required ─────────────────────────────────────────────

  const founderAttention = allScores.filter(a =>
    a.status === "at-risk" ||
    a.status === "needs-attention" ||
    a.flags.includes("Billing overdue") ||
    (a.nextActionDue && (daysUntil(a.nextActionDue) ?? 999) < 3)
  ).sort((a, b) => {
    const priority = (x: AccountScore) =>
      x.status === "at-risk" ? 0 : x.flags.includes("Billing overdue") ? 1 : 2;
    return priority(a) - priority(b);
  });

  // ── Renewal watch (next 60 days) ───────────────────────────────────────────

  const renewalWatch = allScores
    .filter(a => {
      const d = daysUntil(a.renewalDate);
      return d !== null && d >= 0 && d <= 60;
    })
    .sort((a, b) => (daysUntil(a.renewalDate) ?? 999) - (daysUntil(b.renewalDate) ?? 999));

  // ── Retainer growth opportunities ─────────────────────────────────────────
  // Clients billed below their tier potential

  const retainerGrowth = allScores.filter(a => {
    if (a.tier === "flagship" && a.mrr < 8_000)  return true;
    if (a.tier === "growth"   && a.mrr < 4_000)  return true;
    if (a.tier === "maintenance" && a.mrr < 1_500) return true;
    return false;
  }).sort((a, b) => (TIER_RANK[b.tier] ?? 1) - (TIER_RANK[a.tier] ?? 1));

  // ── Licensing opportunities ────────────────────────────────────────────────
  // Flagship clients with active deliverables that could become templates

  const flagshipClients = allScores.filter(a => a.tier === "flagship");
  const licensingOppIds = new Set(flagshipClients.map(a => a.clientId));
  const licensingDeliverables = deliverables.filter(d => {
    const cid = clientId(d.client);
    return cid !== null && licensingOppIds.has(cid) &&
      ["brand-system", "website", "platform", "campaign"].includes(d.category as string);
  });

  // ── Key relationship tracker ───────────────────────────────────────────────

  const keyRelationships = sortedScores.slice(0, 8);

  // ── KPI grid ──────────────────────────────────────────────────────────────

  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((s, a) => s + a.score, 0) / allScores.length)
    : 0;

  const KPI = [
    {
      label: "Active Clients",
      value: String(activeClients.length),
      sub:   `${clients.length} total in system`,
      delta: allScores.filter(a => a.grade === "A").length + " at Grade A",
      alert: false,
    },
    {
      label: "Monthly Revenue",
      value: fmtMoney(totalMRR),
      sub:   `${activeWithMRR.length} retainer clients`,
      delta: `${fmtMoney(totalMRR * 12)} ARR`,
      alert: false,
    },
    {
      label: "Avg Account Score",
      value: String(avgScore),
      sub:   "0 – 100 composite",
      delta: allScores.filter(a => a.score >= 60).length + " accounts ≥ 60",
      alert: avgScore < 50,
    },
    {
      label: "Concentration Risk",
      value: `${top1Pct}%`,
      sub:   `Top client = ${fmtMoney(top1MRR)}/mo`,
      delta: `Top 3 = ${top3Pct}% of MRR`,
      alert: concRisk === "high",
    },
    {
      label: "Founder Alerts",
      value: String(founderAttention.length),
      sub:   "at-risk or overdue",
      delta: founderAttention.length === 0 ? "All clear" : "Action required",
      alert: founderAttention.length > 0,
    },
    {
      label: "Renewal Watch",
      value: String(renewalWatch.length),
      sub:   "next 60 days",
      delta: renewalWatch.filter(a => (daysUntil(a.renewalDate) ?? 999) <= 14).length + " in 14 days",
      alert: renewalWatch.filter(a => (daysUntil(a.renewalDate) ?? 999) <= 14).length > 0,
    },
  ];

  // ── Overall expansion score ────────────────────────────────────────────────

  const expansionScore = Math.min(
    Math.round(
      (expansionCandidates.length / Math.max(activeClients.length, 1)) * 100
    ),
    100,
  );

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${C.borderGold}` }}>
        <div style={{ padding: "0.875rem 1.25rem 0" }}>
          <div className="flex items-center justify-between" style={{ paddingBottom: "0.875rem" }}>

            <div className="flex items-center gap-5">
              <KxdLogo />
              <div>
                <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: C.goldDim }}>
                  KXD OS · Strategic Accounts Intelligence
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.18)", marginTop: "0.125rem" }}>
                  Phase 3A · Live Payload data · Refreshes on every request
                </p>
              </div>
              <span style={{
                fontFamily: C.sans, fontWeight: 600, fontSize: "0.375rem",
                letterSpacing: "0.16em", textTransform: "uppercase" as const,
                color: "rgba(197,166,92,0.75)", background: "rgba(197,166,92,0.07)",
                border: "1px solid rgba(197,166,92,0.2)", padding: "0.2rem 0.6rem",
              }}>
                Phase 3A
              </span>
            </div>

            <div className="flex items-center gap-5">
              <Link href="/admin/operations" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                ← Operations
              </Link>
              <Link href="/admin/operations/today" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                Today →
              </Link>
              <Link href="/admin/operations/growth" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                Growth →
              </Link>
              <Link href="/admin/operations/creative" style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                Creative →
              </Link>
              <Link href="/admin" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.gold, opacity: 0.55, textDecoration: "none" }}>
                Payload →
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>

        {/* ── Page title + expansion score ──────────────────────────────── */}
        <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.875rem" }}>
            KXD OS · Strategic Accounts Intelligence
          </p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.875rem, 5vw, 3.25rem)", lineHeight: 1.02, color: C.cream, letterSpacing: "-0.01em" }}>
                Account Intelligence
              </h1>
              <p style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.2)", marginTop: "0.625rem" }}>
                {dateDisplay} · Loaded {timeDisplay}
              </p>
            </div>

            {/* Expansion opportunity score badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.875rem",
              background: expansionScore >= 30 ? C.tealFaint : C.goldFaint,
              border: `1px solid ${expansionScore >= 30 ? "rgba(150,210,200,0.28)" : C.borderGold}`,
              padding: "0.875rem 1.375rem",
            }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: expansionScore >= 30 ? C.teal : C.gold, flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.5625rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: expansionScore >= 30 ? C.teal : C.gold, lineHeight: 1 }}>
                  Expansion Score — {expansionScore}%
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)", marginTop: "0.375rem" }}>
                  {expansionCandidates.length} account{expansionCandidates.length !== 1 ? "s" : ""} with untapped potential · {activeWithMRR.length} on retainer
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 1. KPI Grid ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: "1.125rem" }}>
          <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>Executive Summary</Label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}`, marginBottom: "2.5rem" }}>
          {KPI.map((kpi) => (
            <div key={kpi.label} style={{ background: C.bgElevated, padding: "1.375rem 1.5rem" }}>
              <Label>{kpi.label}</Label>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.375rem, 2.2vw, 1.875rem)", lineHeight: 1, color: kpi.alert ? C.yellow : C.cream, marginTop: "0.625rem", letterSpacing: "-0.01em" }}>
                {kpi.value}
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em", marginTop: "0.375rem" }}>
                {kpi.sub}
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: kpi.alert ? C.red : C.goldDim, letterSpacing: "0.06em", marginTop: "0.5rem" }}>
                {kpi.delta}
              </p>
            </div>
          ))}
        </div>

        {/* ── 2. Strategic Account Score ────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Strategic Account Score"
            sub="Composite 0–100 across tier, MRR, health, projects, and engagement"
            href="/admin/collections/clients"
            linkText="Manage Clients →"
          />

          {sortedScores.length === 0 ? (
            <EmptyState message="No active clients found. Add client records to begin scoring." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "1px", background: C.border }}>
              {sortedScores.map((a) => (
                <div key={a.clientId} style={{ background: C.bgElevated, padding: "1rem 1.375rem", display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" as const }}>

                  {/* Grade badge */}
                  <div style={{ width: "2.5rem", height: "2.5rem", background: `${a.gradeColor}14`, border: `1px solid ${a.gradeColor}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.125rem", color: a.gradeColor }}>
                      {a.grade}
                    </span>
                  </div>

                  {/* Client name + tier */}
                  <div style={{ minWidth: "10rem", flex: "1 1 10rem" }}>
                    <Link href={`/admin/collections/clients/${a.clientId}`} style={{ textDecoration: "none" }}>
                      <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.75rem", color: C.cream, letterSpacing: "0.01em" }}>
                        {a.name}
                      </p>
                    </Link>
                    <div className="flex items-center gap-2" style={{ marginTop: "0.25rem" }}>
                      <span style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: TIER_COLOR[a.tier] ?? C.creamMuted }}>
                        {TIER_LABEL[a.tier] ?? a.tier}
                      </span>
                      <span style={{ width: "1px", height: "8px", background: "rgba(255,255,255,0.12)" }} />
                      <span style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: STATUS_COLOR[a.status] ?? C.creamMuted }}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div style={{ flex: "2 1 14rem", minWidth: "10rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.07)", position: "relative" as const }}>
                        <div style={{ position: "absolute" as const, top: 0, left: 0, width: `${a.score}%`, height: "100%", background: a.gradeColor }} />
                      </div>
                      <span style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.5625rem", color: a.gradeColor, letterSpacing: "0.04em", flexShrink: 0 }}>
                        {a.score}
                      </span>
                    </div>
                    {/* Flags */}
                    {a.flags.length > 0 && (
                      <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(210,90,90,0.7)", letterSpacing: "0.06em", marginTop: "0.375rem" }}>
                        ⚠ {a.flags.join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* MRR */}
                  <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                    <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: a.mrr > 0 ? C.cream : "rgba(255,255,255,0.25)", letterSpacing: "-0.01em" }}>
                      {fmtMoney(a.mrr)}
                    </p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginTop: "0.2rem" }}>
                      /month
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden xl:flex" style={{ gap: "1rem", flexShrink: 0 }}>
                    {[
                      { v: a.projectCount,  l: "Projects"  },
                      { v: a.requestCount,  l: "Requests"  },
                      { v: a.retainerCount, l: "Retainers" },
                    ].map(({ v, l }) => (
                      <div key={l} style={{ textAlign: "center" as const }}>
                        <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.6875rem", color: v > 0 ? C.creamMuted : "rgba(255,255,255,0.2)" }}>{v}</p>
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)" }}>{l}</p>
                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 3. Revenue Concentration Analysis ────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Revenue Concentration Analysis"
            sub="MRR distribution across account base — identifies dependency risk"
          />

          <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: "1.25rem" }}>

            {/* Concentration risk card */}
            <div style={{ background: C.bgElevated, border: `1px solid ${concColor}30`, padding: "1.5rem" }}>
              <div className="flex items-center gap-3" style={{ marginBottom: "1.25rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: concColor }} />
                <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.5625rem", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: concColor }}>
                  Concentration Risk — {concRisk.toUpperCase()}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.875rem" }}>
                <div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const }}>
                    Top Client
                  </p>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem", color: concColor, letterSpacing: "-0.01em", marginTop: "0.25rem" }}>
                    {top1Pct}% <span style={{ fontSize: "0.875rem", color: C.creamMuted }}>of total MRR</span>
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", marginTop: "0.25rem" }}>
                    {activeWithMRR[0]?.name ?? "—"} · {fmtMoney(top1MRR)}/mo
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const }}>
                    Top 3 Combined
                  </p>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.125rem", color: C.creamMuted, letterSpacing: "-0.01em", marginTop: "0.25rem" }}>
                    {top3Pct}% <span style={{ fontSize: "0.75rem" }}>of total MRR</span>
                  </p>
                </div>
                <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", borderTop: `1px solid ${C.border}`, paddingTop: "0.75rem" }}>
                  {concRisk === "high"
                    ? "High concentration — single client loss would significantly impact revenue."
                    : concRisk === "medium"
                    ? "Moderate concentration — consider diversifying retainer base."
                    : "Healthy distribution — no single client dominates the revenue base."}
                </p>
              </div>
            </div>

            {/* MRR waterfall by client */}
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.5rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "1rem" }}>
                MRR by Account
              </p>
              {activeWithMRR.length === 0 ? (
                <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)" }}>No retainer revenue recorded.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.625rem" }}>
                  {activeWithMRR.slice(0, 8).map((a) => {
                    const pct = totalMRR > 0 ? (a.mrr / totalMRR) * 100 : 0;
                    return (
                      <div key={a.clientId}>
                        <div className="flex justify-between" style={{ marginBottom: "0.25rem" }}>
                          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted }}>
                            {a.name}
                          </p>
                          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.cream }}>
                            {fmtMoney(a.mrr)}
                          </p>
                        </div>
                        <div style={{ height: "2px", background: "rgba(255,255,255,0.07)", position: "relative" as const }}>
                          <div style={{ position: "absolute" as const, top: 0, left: 0, width: `${pct}%`, height: "100%", background: TIER_COLOR[a.tier] ?? C.gold }} />
                        </div>
                      </div>
                    );
                  })}
                  {activeWithMRR.length > 8 && (
                    <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.25)", marginTop: "0.5rem" }}>
                      +{activeWithMRR.length - 8} more accounts
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 4. Founder Attention Required ────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Founder Attention Required"
            sub="At-risk relationships, overdue billing, and overdue next actions"
            href="/admin/collections/clients"
            linkText="View Clients →"
          />

          {founderAttention.length === 0 ? (
            <div style={{ background: C.bgElevated, border: `1px solid rgba(94,198,140,0.2)`, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.green, flexShrink: 0 }} />
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.green, letterSpacing: "0.04em" }}>
                All accounts clear — no founder attention required right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" style={{ gap: "1px", background: C.border }}>
              {founderAttention.map((a) => {
                const isCritical = a.status === "at-risk" || a.flags.includes("Billing overdue");
                const accentColor = isCritical ? C.red : C.yellow;
                return (
                  <div key={a.clientId} style={{
                    background: C.bgElevated, padding: "1.25rem 1.375rem",
                    borderLeft: `3px solid ${accentColor}`,
                  }}>
                    <div className="flex items-start justify-between gap-2" style={{ marginBottom: "0.625rem" }}>
                      <Link href={`/admin/collections/clients/${a.clientId}`} style={{ textDecoration: "none" }}>
                        <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream, letterSpacing: "0.01em" }}>
                          {a.name}
                        </p>
                      </Link>
                      <Badge color={accentColor}>
                        {a.status === "at-risk" ? "At Risk"
                          : a.flags.includes("Billing overdue") ? "Overdue"
                          : "Attention"}
                      </Badge>
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: TIER_COLOR[a.tier] ?? C.creamMuted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>
                      {TIER_LABEL[a.tier] ?? a.tier} · {fmtMoney(a.mrr)}/mo
                    </p>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.25rem" }}>
                      {a.flags.map(f => (
                        <p key={f} style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(210,90,90,0.75)", letterSpacing: "0.06em" }}>
                          ⚠ {f}
                        </p>
                      ))}
                    </div>
                    {a.nextAction && (
                      <div style={{ marginTop: "0.625rem", padding: "0.5rem 0.625rem", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: "0.25rem" }}>
                          Next Action
                        </p>
                        <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.creamMuted }}>
                          {a.nextAction}
                        </p>
                        {a.nextActionDue && (
                          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: (daysUntil(a.nextActionDue) ?? 999) < 0 ? C.red : C.goldDim, marginTop: "0.25rem" }}>
                            Due {fmtDate(a.nextActionDue)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 5. Retainer Growth Opportunities ─────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Retainer Growth Opportunities"
            sub="Accounts billed below their tier's revenue potential"
            href="/admin/collections/retainers"
            linkText="Manage Retainers →"
          />

          {retainerGrowth.length === 0 ? (
            <EmptyState message="All retainer clients are billing at or above tier benchmarks." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" style={{ gap: "1px", background: C.border }}>
              {retainerGrowth.map((a) => {
                const benchmark =
                  a.tier === "flagship" ? 8_000
                  : a.tier === "growth" ? 4_000
                  : 1_500;
                const gap = benchmark - a.mrr;
                return (
                  <div key={a.clientId} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
                    <div className="flex items-start justify-between gap-2" style={{ marginBottom: "0.5rem" }}>
                      <Link href={`/admin/collections/clients/${a.clientId}`} style={{ textDecoration: "none" }}>
                        <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream }}>
                          {a.name}
                        </p>
                      </Link>
                      <Badge color={TIER_COLOR[a.tier] ?? C.creamMuted}>
                        {TIER_LABEL[a.tier] ?? a.tier}
                      </Badge>
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.625rem" }}>
                      <div>
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const }}>Current MRR</p>
                        <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.creamMuted, marginTop: "0.125rem" }}>{fmtMoney(a.mrr)}</p>
                      </div>
                      <div>
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const }}>Tier Benchmark</p>
                        <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.teal, marginTop: "0.125rem" }}>{fmtMoney(benchmark)}</p>
                      </div>
                      <div>
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const }}>Upside</p>
                        <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.gold, marginTop: "0.125rem" }}>+{fmtMoney(gap)}</p>
                      </div>
                    </div>
                    <div style={{ height: "2px", background: "rgba(255,255,255,0.07)", position: "relative" as const }}>
                      <div style={{ position: "absolute" as const, top: 0, left: 0, width: `${Math.min((a.mrr / benchmark) * 100, 100)}%`, height: "100%", background: TIER_COLOR[a.tier] ?? C.gold }} />
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: "rgba(255,255,255,0.2)", marginTop: "0.375rem" }}>
                      {Math.round((a.mrr / benchmark) * 100)}% of tier benchmark
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 6. White Space Opportunities ──────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="White Space Opportunities"
            sub="Retainer clients with no active projects — untapped scope potential"
            href="/admin/collections/client-projects"
            linkText="View Projects →"
          />

          {whiteSpace.length === 0 ? (
            <EmptyState message="All retainer clients have active projects — no white space detected." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: "1px", background: C.border }}>
              {whiteSpace.map((c) => {
                const cid  = c.id as number;
                const score = allScores.find(a => a.clientId === cid);
                return (
                  <div key={cid} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
                    <Link href={`/admin/collections/clients/${cid}`} style={{ textDecoration: "none" }}>
                      <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream, marginBottom: "0.375rem" }}>
                        {c.name}
                      </p>
                    </Link>
                    <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", color: TIER_COLOR[c.brandTier as string] ?? C.creamMuted, textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>
                      {TIER_LABEL[c.brandTier as string] ?? c.brandTier}
                    </p>
                    <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.teal, marginBottom: "0.25rem" }}>
                      {fmtMoney(c.monthlyRetainerAmount as number)}
                      <span style={{ fontSize: "0.75rem", color: C.creamMuted }}>/mo</span>
                    </p>
                    {score?.nextAction ? (
                      <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", marginTop: "0.5rem" }}>
                        → {score.nextAction}
                      </p>
                    ) : (
                      <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(210,90,90,0.5)", letterSpacing: "0.06em", marginTop: "0.5rem" }}>
                        No next action defined
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 7. Renewal Watch ──────────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Renewal Watch"
            sub="Retainer contracts renewing within the next 60 days"
            href="/admin/collections/retainers"
            linkText="View Retainers →"
          />

          {renewalWatch.length === 0 ? (
            <EmptyState message="No retainer renewals in the next 60 days." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "1px", background: C.border }}>
              {renewalWatch.map((a) => {
                const days    = daysUntil(a.renewalDate) ?? 0;
                const urgent  = days <= 14;
                const acColor = urgent ? C.red : days <= 30 ? C.yellow : C.teal;
                return (
                  <div key={a.clientId} style={{ background: C.bgElevated, padding: "1rem 1.375rem", display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" as const }}>

                    {/* Days countdown */}
                    <div style={{ width: "3.5rem", textAlign: "center" as const, flexShrink: 0 }}>
                      <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.5rem", color: acColor, lineHeight: 1 }}>
                        {days}
                      </p>
                      <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const }}>
                        {days === 1 ? "day" : "days"}
                      </p>
                    </div>

                    <div style={{ flex: 1, minWidth: "10rem" }}>
                      <Link href={`/admin/collections/clients/${a.clientId}`} style={{ textDecoration: "none" }}>
                        <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream }}>
                          {a.name}
                        </p>
                      </Link>
                      <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: TIER_COLOR[a.tier] ?? C.creamMuted, textTransform: "uppercase" as const, marginTop: "0.2rem" }}>
                        {TIER_LABEL[a.tier] ?? a.tier}
                      </p>
                    </div>

                    <div style={{ textAlign: "right" as const }}>
                      <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.cream }}>
                        {fmtMoney(a.mrr)}<span style={{ fontSize: "0.625rem", color: C.creamMuted }}>/mo</span>
                      </p>
                      <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.3)", marginTop: "0.2rem" }}>
                        Renews {fmtDate(a.renewalDate)}
                      </p>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <Badge color={acColor}>
                        {urgent ? "Urgent" : days <= 30 ? "Soon" : "Watch"}
                      </Badge>
                    </div>

                    {!a.hasAutoRenew && (
                      <div style={{ flexShrink: 0 }}>
                        <Badge color={C.red}>Manual Renewal</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 8. Licensing Opportunities ────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Licensing Opportunities"
            sub="Flagship client deliverables with asset licensing or template potential"
            href="/admin/collections/monthly-deliverables"
            linkText="View Deliverables →"
          />

          {flagshipClients.length === 0 ? (
            <EmptyState message="No flagship clients. Promote accounts to Flagship tier to unlock licensing intelligence." />
          ) : licensingDeliverables.length === 0 ? (
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.375rem 1.5rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, letterSpacing: "0.02em", marginBottom: "0.5rem" }}>
                {flagshipClients.length} flagship client{flagshipClients.length !== 1 ? "s" : ""} on file — no deliverables categorised as brand-system, website, platform, or campaign yet.
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.25)" }}>
                Flagship accounts: {flagshipClients.map(a => a.name).join(", ")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" style={{ gap: "1px", background: C.border }}>
              {licensingDeliverables.slice(0, 9).map((d, i) => (
                <div key={i} style={{ background: C.bgElevated, padding: "1.125rem 1.375rem" }}>
                  <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream, marginBottom: "0.25rem" }}>
                    {(d.title as string) || "Untitled Deliverable"}
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.375rem" }}>
                    {clientName(d.client)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge color={C.purple}>{(d.category as string) || "Other"}</Badge>
                    {d.status && <Badge color={C.creamMuted}>{d.status as string}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 9. Key Relationship Tracker ───────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Key Relationship Tracker"
            sub="Top 8 accounts by composite score — next actions and health at a glance"
            href="/admin/collections/clients"
            linkText="All Clients →"
          />

          {keyRelationships.length === 0 ? (
            <EmptyState message="No active clients found." />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: "1px", background: C.border }}>
              {keyRelationships.map((a) => (
                <div key={a.clientId} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
                  <div className="flex items-start justify-between gap-3" style={{ marginBottom: "0.75rem" }}>
                    <div>
                      <Link href={`/admin/collections/clients/${a.clientId}`} style={{ textDecoration: "none" }}>
                        <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.75rem", color: C.cream }}>
                          {a.name}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2" style={{ marginTop: "0.25rem" }}>
                        <span style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: TIER_COLOR[a.tier] ?? C.creamMuted }}>
                          {TIER_LABEL[a.tier] ?? a.tier}
                        </span>
                        <span style={{ width: "1px", height: "8px", background: "rgba(255,255,255,0.12)" }} />
                        <span style={{ fontFamily: C.sans, fontSize: "0.375rem", color: STATUS_COLOR[a.status] ?? C.creamMuted }}>
                          {STATUS_LABEL[a.status] ?? a.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <div style={{ textAlign: "right" as const }}>
                        <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.cream }}>{fmtMoney(a.mrr)}</p>
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: "rgba(255,255,255,0.25)" }}>/month</p>
                      </div>
                      <div style={{ width: "2rem", height: "2rem", background: `${a.gradeColor}14`, border: `1px solid ${a.gradeColor}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "0.875rem", color: a.gradeColor }}>
                          {a.grade}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ flex: 1, height: "2px", background: "rgba(255,255,255,0.07)", position: "relative" as const }}>
                        <div style={{ position: "absolute" as const, top: 0, left: 0, width: `${a.score}%`, height: "100%", background: a.gradeColor }} />
                      </div>
                      <span style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: a.gradeColor }}>{a.score}/100</span>
                    </div>
                  </div>

                  {/* Next action */}
                  {a.nextAction ? (
                    <div style={{ padding: "0.5rem 0.625rem", background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                      <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: "0.2rem" }}>
                        Next Action
                      </p>
                      <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.creamMuted }}>
                        {a.nextAction}
                      </p>
                      {a.nextActionDue && (
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: (daysUntil(a.nextActionDue) ?? 999) < 0 ? C.red : C.goldDim, marginTop: "0.2rem" }}>
                          Due {fmtDate(a.nextActionDue)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(210,90,90,0.45)", letterSpacing: "0.06em" }}>
                      No next action defined
                    </p>
                  )}

                  {/* Strengths */}
                  {a.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1" style={{ marginTop: "0.625rem" }}>
                      {a.strengths.map(s => (
                        <span key={s} style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: "rgba(94,198,140,0.7)", border: "1px solid rgba(94,198,140,0.2)", padding: "0.125rem 0.375rem" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{ marginTop: "2.5rem", padding: "1rem 1.25rem", background: C.goldFaint, border: `1px solid ${C.borderGold}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: "0.5rem" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.22)" }}>
            KXD OS · Strategic Accounts Intelligence · Phase 3A · Live Payload data · Refreshes on each request
          </p>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" as const }}>
            {([
              ["/admin/operations",          "Operations"],
              ["/admin/operations/today",    "Today"],
              ["/admin/operations/growth",   "Growth"],
              ["/admin/operations/creative", "Creative"],
              ["/admin/collections/clients", "Clients"],
              ["/admin/collections/retainers", "Retainers"],
              ["/admin",                     "Payload"],
            ] as [string, string][]).map(([href, label]) => (
              <Link key={href} href={href} style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.gold, opacity: 0.45, textDecoration: "none" }}>
                {label} →
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
