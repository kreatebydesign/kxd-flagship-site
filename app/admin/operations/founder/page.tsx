/**
 * /admin/operations/founder
 * KXD OS — Founder Command Center
 * Phase 3B
 *
 * Single morning dashboard for the KXD founder. Executive intelligence across
 * revenue, pipeline, accounts, and operations — distilled into one focused view.
 *
 * Architecture:
 *   — export const dynamic = "force-dynamic"  (live on every request)
 *   — 5 parallel Payload queries via Promise.allSettled
 *   — Full graceful degradation on any failed query
 *   — No writes, no mutations, no schema changes
 *   — Self-contained styling: C tokens, inline styles, Tailwind layout
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
  goldBright:  "#d4b96a",
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

// ── Constants ─────────────────────────────────────────────────────────────────

const ANNUAL_GOAL = 1_000_000;

const TIER_RANK: Record<string, number> = {
  flagship: 4, growth: 3, maintenance: 2, internal: 1,
};
const TIER_COLOR: Record<string, string> = {
  flagship: C.gold, growth: C.teal, maintenance: C.creamMuted, internal: "rgba(255,255,255,0.25)",
};
const TIER_LABEL: Record<string, string> = {
  flagship: "Flagship", growth: "Growth", maintenance: "Maintenance", internal: "Internal",
};
const STATUS_COLOR: Record<string, string> = {
  healthy: C.green, "needs-attention": C.yellow, "at-risk": C.red, paused: C.creamMuted,
};
const STATUS_LABEL: Record<string, string> = {
  healthy: "Healthy", "needs-attention": "Needs Attention", "at-risk": "At Risk", paused: "Paused",
};

// ── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

interface PriorityItem {
  label:    string;
  sub:      string;
  urgency:  "critical" | "high" | "medium";
  href?:    string;
  value?:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function fmtMoneyCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtMoney(n);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try { return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000); }
  catch { return null; }
}

function clientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null && "id" in raw) return (raw as AnyDoc).id as number;
  if (typeof raw === "number") return raw;
  return null;
}

function clientName(raw: unknown): string {
  if (!raw) return "Unknown";
  if (typeof raw === "object" && raw !== null && "name" in raw) return String((raw as AnyDoc).name) || "Unknown";
  return "Unknown";
}

// ── Account scoring (mirrored from Accounts page) ─────────────────────────────

interface AccountScore {
  clientId:    number;
  name:        string;
  tier:        string;
  status:      string;
  mrr:         number;
  score:       number;
  grade:       "A" | "B" | "C" | "D";
  gradeColor:  string;
  flags:       string[];
  strengths:   string[];
  nextAction:  string | null;
  nextActionDue: string | null;
  retainerCount: number;
  requestCount:  number;
  projectCount:  number;
  renewalDate:   string | null;
  hasAutoRenew:  boolean;
}

function scoreAccount(
  client:    AnyDoc,
  retainers: AnyDoc[],
  requests:  AnyDoc[],
  projects:  AnyDoc[],
): AccountScore {
  const cid    = client.id as number;
  const name   = String(client.name || "Unknown");
  const tier   = String(client.brandTier || "maintenance");
  const status = String(client.relationshipStatus || "healthy");
  const mrr    = Number(client.monthlyRetainerAmount) || 0;

  const cRetainers = retainers.filter(r => clientId(r.client) === cid);
  const cRequests  = requests.filter(r => clientId(r.client) === cid);
  const cProjects  = projects.filter(p => clientId(p.client) === cid);

  const activeRet    = cRetainers.find(r => r.billingStatus === "active" || r.billingStatus === "pending");
  const renewalDate  = String(activeRet?.renewalDate ?? "") || null;
  const hasAutoRenew = Boolean(activeRet?.autoRenew);

  let s = 0;
  const flags: string[] = [], strengths: string[] = [];

  s += (TIER_RANK[tier] ?? 1) * 6;

  if (mrr >= 10_000) { s += 20; strengths.push("High MRR"); }
  else if (mrr >= 5_000) s += 14;
  else if (mrr >= 2_500) s += 8;
  else if (mrr > 0) s += 3;
  else flags.push("No active retainer");

  if (status === "healthy") { s += 20; strengths.push("Healthy relationship"); }
  else if (status === "needs-attention") { s += 10; flags.push("Needs attention"); }
  else if (status === "at-risk") flags.push("Relationship at risk");
  else if (status === "paused") s += 5;

  const activeProj = cProjects.filter(p => ["active", "in-progress", "review", "launch-ready"].includes(String(p.status)));
  if (activeProj.length >= 2) { s += 15; strengths.push("Multiple active projects"); }
  else if (activeProj.length === 1) s += 8;
  else flags.push("No active projects");

  const recentReqs = cRequests.filter(r => r.createdAt && Date.now() - new Date(r.createdAt).getTime() < 90 * 86_400_000);
  if (recentReqs.length >= 3) { s += 10; strengths.push("High engagement"); }
  else if (recentReqs.length >= 1) s += 5;

  if (client.nextAction) s += 10;
  else flags.push("No next action");

  if (activeRet?.billingStatus === "overdue") flags.push("Billing overdue");

  const clamped   = Math.min(s, 100);
  const grade     = clamped >= 80 ? "A" : clamped >= 60 ? "B" : clamped >= 40 ? "C" : "D" as "A" | "B" | "C" | "D";
  const gradeColor = grade === "A" ? C.green : grade === "B" ? C.teal : grade === "C" ? C.yellow : C.red;

  return {
    clientId: cid, name, tier, status, mrr, score: clamped, grade, gradeColor,
    flags, strengths,
    nextAction:    String(client.nextAction || "") || null,
    nextActionDue: String(client.nextActionDueDate || "") || null,
    retainerCount: cRetainers.length,
    requestCount:  cRequests.length,
    projectCount:  cProjects.length,
    renewalDate,
    hasAutoRenew,
  };
}

// ── UI primitives ─────────────────────────────────────────────────────────────

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
}: { label: string; sub?: string; href?: string; linkText?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      marginBottom: "1.125rem", paddingBottom: "0.75rem",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div>
        <Label style={{ marginBottom: "0.375rem" }}>{label}</Label>
        {sub && <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, letterSpacing: "0.02em" }}>{sub}</p>}
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
      color, border: `1px solid ${color}`, opacity: 0.85,
      padding: "0.125rem 0.5rem", whiteSpace: "nowrap" as const,
    }}>
      {children}
    </span>
  );
}

// ── Urgency bar color ──────────────────────────────────────────────────────────

const URGENCY_COLOR = { critical: C.red, high: C.yellow, medium: C.teal } as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FounderPage() {
  const payload = await getPayload({ config });

  const now         = new Date();
  const weekStart   = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd     = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndISO  = weekEnd.toISOString();
  const nowISO      = now.toISOString();

  const dateDisplay = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeDisplay = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // ── 5 parallel queries ──────────────────────────────────────────────────────
  const [clientsR, retainersR, projectsR, requestsR, inqR] =
    await Promise.allSettled([
      payload.find({ collection: "clients", limit: 200, depth: 0 }),
      payload.find({ collection: "retainers", limit: 200, depth: 1 }),
      payload.find({ collection: "client-projects", limit: 500, depth: 1 }),
      payload.find({ collection: "client-requests", limit: 500, depth: 1 }),
      payload.find({
        collection: "project-inquiries", limit: 100, depth: 0,
        where: { status: { in: ["new", "reviewing", "discovery", "proposal"] } },
      }),
    ]);

  const allClients:  AnyDoc[] = clientsR.status   === "fulfilled" ? clientsR.value.docs   as AnyDoc[] : [];
  const retainers:   AnyDoc[] = retainersR.status === "fulfilled" ? retainersR.value.docs as AnyDoc[] : [];
  const projects:    AnyDoc[] = projectsR.status  === "fulfilled" ? projectsR.value.docs  as AnyDoc[] : [];
  const requests:    AnyDoc[] = requestsR.status  === "fulfilled" ? requestsR.value.docs  as AnyDoc[] : [];
  const inquiries:   AnyDoc[] = inqR.status       === "fulfilled" ? inqR.value.docs       as AnyDoc[] : [];

  // ── Computed segments ──────────────────────────────────────────────────────
  const activeClients  = allClients.filter(c => c.status === "active");
  const allScores      = activeClients.map(c => scoreAccount(c, retainers, requests, projects));
  const sortedScores   = [...allScores].sort((a, b) => b.score - a.score);

  // Revenue
  const totalMRR   = allScores.reduce((s, a) => s + a.mrr, 0);
  const annualProj = totalMRR * 12;
  const goalGap    = Math.max(ANNUAL_GOAL - annualProj, 0);
  const goalPct    = Math.min(Math.round((annualProj / ANNUAL_GOAL) * 100), 100);
  const mrrNeeded  = Math.max(Math.ceil(ANNUAL_GOAL / 12) - totalMRR, 0);

  type RevStatus = "on-track" | "building" | "behind";
  const revStatus: RevStatus =
    goalPct >= 85 ? "on-track" : goalPct >= 55 ? "building" : "behind";
  const REV_CFG: Record<RevStatus, { label: string; color: string; dot: string; bg: string; border: string }> = {
    "on-track": { label: "On Track", color: C.green,  dot: C.green,  bg: C.greenFaint, border: C.greenBorder },
    "building": { label: "Building Momentum", color: C.teal,   dot: C.teal,   bg: C.tealFaint,  border: "rgba(150,210,200,0.28)" },
    "behind":   { label: "Behind Target",     color: C.red,    dot: C.red,    bg: C.redFaint,   border: C.redBorder },
  };
  const rev = REV_CFG[revStatus];

  // Concentration
  const withMRR     = allScores.filter(a => a.mrr > 0).sort((a, b) => b.mrr - a.mrr);
  const top1MRR     = withMRR[0]?.mrr ?? 0;
  const top3MRR     = withMRR.slice(0, 3).reduce((s, a) => s + a.mrr, 0);
  const top1Pct     = totalMRR > 0 ? Math.round((top1MRR / totalMRR) * 100) : 0;
  const top3Pct     = totalMRR > 0 ? Math.round((top3MRR / totalMRR) * 100) : 0;
  const concRisk    = top1Pct >= 40 ? "high" : top1Pct >= 25 ? "moderate" : "diversified";
  const concColor   = concRisk === "high" ? C.red : concRisk === "moderate" ? C.yellow : C.green;
  const concLabel   = concRisk === "high" ? "High Concentration" : concRisk === "moderate" ? "Moderate Risk" : "Diversified";

  // Pipeline
  const INVEST_MID: Record<string, number> = {
    "under-10k": 7_500, "10k-25k": 17_500, "25k-50k": 37_500,
    "50k-100k": 75_000, "100k-plus": 125_000, "not-determined": 0,
  };
  const pipelineValue = inquiries.reduce((s, i) => s + (INVEST_MID[String(i.investmentRange)] ?? 0), 0);

  // Open / overdue requests
  const openRequests  = requests.filter(r => !["completed", "cancelled"].includes(String(r.status)));
  const overdueReqs   = openRequests.filter(r => r.dueDate && new Date(r.dueDate as string) < now);
  const urgentReqs    = openRequests.filter(r => r.priority === "urgent" || r.priority === "high");

  // Deliverables due this week
  const delivsWeek = projects.filter(p => {
    const due = p.targetLaunchDate as string | null;
    if (!due) return false;
    const d = new Date(due);
    return d >= weekStart && d <= weekEnd;
  });

  // Accounts needing attention
  const atRisk     = allScores.filter(a => a.status === "at-risk" || a.flags.includes("Billing overdue"));
  const needsAttn  = allScores.filter(a => a.status === "needs-attention");
  const attnCount  = atRisk.length + needsAttn.length;

  // Renewals in 60 days
  const renewalWatch = allScores.filter(a => {
    const d = daysUntil(a.renewalDate);
    return d !== null && d >= 0 && d <= 60;
  }).sort((a, b) => (daysUntil(a.renewalDate) ?? 999) - (daysUntil(b.renewalDate) ?? 999));

  // Expansion candidates
  const expansionCandidates = allScores.filter(a => {
    if (a.tier === "flagship" && a.mrr < 8_000) return true;
    if (a.tier === "growth"   && a.mrr < 4_000) return true;
    if (a.tier === "maintenance" && a.mrr < 1_500 && a.mrr > 0) return true;
    return false;
  }).sort((a, b) => (TIER_RANK[b.tier] ?? 1) - (TIER_RANK[a.tier] ?? 1));

  const expansionUpside = expansionCandidates.reduce((s, a) => {
    const bench = a.tier === "flagship" ? 8_000 : a.tier === "growth" ? 4_000 : 1_500;
    return s + Math.max(bench - a.mrr, 0);
  }, 0);

  const whiteSpace = activeClients.filter(c => {
    const cid    = c.id as number;
    const hasMRR = Number(c.monthlyRetainerAmount) > 0;
    const hasProj = projects.some(p =>
      clientId(p.client) === cid &&
      ["active", "in-progress", "review", "launch-ready"].includes(String(p.status))
    );
    return hasMRR && !hasProj;
  });

  // ── KPI strip ──────────────────────────────────────────────────────────────
  const KPI = [
    { label: "Monthly MRR",          value: fmtMoneyCompact(totalMRR),    sub: `${fmtMoneyCompact(annualProj)} ARR`,                 delta: `${goalPct}% of $1M goal`,                               alert: revStatus === "behind" },
    { label: "Pipeline Value",        value: fmtMoneyCompact(pipelineValue), sub: `${inquiries.length} active opportunities`,         delta: inquiries.length > 0 ? "Opportunities in play" : "No pipeline", alert: false },
    { label: "Active Clients",        value: String(activeClients.length), sub: `${withMRR.length} on retainer`,                     delta: `${allScores.filter(a => a.grade === "A").length} at Grade A`,   alert: false },
    { label: "Open Requests",         value: String(openRequests.length),  sub: `${overdueReqs.length} overdue`,                     delta: urgentReqs.length > 0 ? `${urgentReqs.length} urgent` : "None urgent", alert: overdueReqs.length > 0 },
    { label: "Due This Week",         value: String(delivsWeek.length),    sub: "projects reaching target",                          delta: delivsWeek.length > 0 ? "Action required" : "Clear week",          alert: delivsWeek.length > 0 },
    { label: "Accounts Needing Attn", value: String(attnCount),            sub: `${atRisk.length} at risk · ${needsAttn.length} flagged`, delta: attnCount === 0 ? "All clear" : "Founder review needed",   alert: attnCount > 0 },
  ];

  // ── Founder Momentum Score (0-100) ─────────────────────────────────────────
  let momentum = 0;
  // Revenue progress (30 pts)
  momentum += Math.min(Math.round((annualProj / ANNUAL_GOAL) * 30), 30);
  // Pipeline health (20 pts)
  momentum += inquiries.length >= 5 ? 20 : inquiries.length >= 2 ? 14 : inquiries.length >= 1 ? 8 : 0;
  // Client health (25 pts)
  const healthyPct = allScores.length > 0 ? allScores.filter(a => a.status === "healthy").length / allScores.length : 0;
  momentum += Math.round(healthyPct * 25);
  // Expansion signal (15 pts)
  momentum += expansionCandidates.length === 0 ? 15 : expansionCandidates.length <= 2 ? 10 : 5;
  // Workload clarity (10 pts)
  momentum += overdueReqs.length === 0 ? 10 : overdueReqs.length <= 2 ? 6 : 2;

  const momentumScore = Math.min(momentum, 100);
  type MomentumLevel = "elite" | "strong" | "building" | "needs-attention";
  const momentumLevel: MomentumLevel =
    momentumScore >= 85 ? "elite" : momentumScore >= 65 ? "strong" : momentumScore >= 45 ? "building" : "needs-attention";
  const MOMENTUM_CFG: Record<MomentumLevel, { label: string; color: string; bg: string; border: string; description: string }> = {
    "elite":           { label: "Elite",            color: C.gold,    bg: C.goldFaint,   border: C.borderGold,              description: "KXD is firing on all cylinders. Revenue, pipeline, and clients are all strong." },
    "strong":          { label: "Strong",           color: C.green,   bg: C.greenFaint,  border: C.greenBorder,             description: "Strong business performance. Focus on acceleration opportunities." },
    "building":        { label: "Building",         color: C.teal,    bg: C.tealFaint,   border: "rgba(150,210,200,0.28)",  description: "Momentum is building. Identify the one constraint holding growth back." },
    "needs-attention": { label: "Needs Attention",  color: C.yellow,  bg: C.yellowFaint, border: "rgba(240,190,80,0.28)",   description: "Business needs active founder attention across revenue and client health." },
  };
  const mom = MOMENTUM_CFG[momentumLevel];

  // ── Founder Priorities (ranked) ────────────────────────────────────────────
  const priorities: PriorityItem[] = [];

  // Critical: at-risk accounts
  for (const a of atRisk.slice(0, 2)) {
    priorities.push({
      label:   `${a.name} — Relationship At Risk`,
      sub:     `${fmtMoney(a.mrr)}/mo · ${a.flags.join(" · ")}`,
      urgency: "critical",
      href:    `/admin/collections/clients/${a.clientId}`,
      value:   fmtMoney(a.mrr),
    });
  }

  // Critical: overdue requests
  for (const r of overdueReqs.slice(0, 2)) {
    const days = Math.abs(daysUntil(r.dueDate as string) ?? 0);
    priorities.push({
      label:   String(r.requestTitle || "Overdue Client Request"),
      sub:     `${clientName(r.client)} · Overdue by ${days}d · ${String(r.priority || "normal")} priority`,
      urgency: "critical",
      href:    `/admin/collections/client-requests/${r.id}`,
    });
  }

  // High: renewals within 14 days
  for (const a of renewalWatch.filter(x => (daysUntil(x.renewalDate) ?? 999) <= 14).slice(0, 2)) {
    const d = daysUntil(a.renewalDate) ?? 0;
    priorities.push({
      label:   `${a.name} — Renewal in ${d} Day${d !== 1 ? "s" : ""}`,
      sub:     `${fmtMoney(a.mrr)}/mo · ${a.hasAutoRenew ? "Auto-renew on" : "Manual renewal required"}`,
      urgency: "high",
      href:    `/admin/collections/clients/${a.clientId}`,
      value:   fmtMoney(a.mrr),
    });
  }

  // High: high-value pipeline
  for (const i of inquiries.filter(x => ["100k-plus", "50k-100k"].includes(String(x.investmentRange))).slice(0, 2)) {
    priorities.push({
      label:   `${String(i.companyName || i.contactName || "Prospect")} — High-Value Opportunity`,
      sub:     `${String(i.investmentRange || "").replace(/-/g, " ").replace(/k/g, "K").replace(/plus/, "+")} · ${String(i.status || "new")}`,
      urgency: "high",
      href:    `/admin/collections/project-inquiries/${i.id}`,
      value:   fmtMoney(INVEST_MID[String(i.investmentRange)] ?? 0),
    });
  }

  // Medium: accounts with no next action
  for (const a of allScores.filter(x => !x.nextAction && x.tier === "flagship").slice(0, 2)) {
    priorities.push({
      label:   `${a.name} — No Next Action Defined`,
      sub:     `Flagship · ${fmtMoney(a.mrr)}/mo · Needs strategic direction`,
      urgency: "medium",
      href:    `/admin/collections/clients/${a.clientId}`,
    });
  }

  const topPriorities = priorities.slice(0, 5);

  // ── Weekly Focus ───────────────────────────────────────────────────────────

  const biggestOpp  = expansionCandidates[0]
    ? `Expand ${expansionCandidates[0].name} to ${TIER_LABEL[expansionCandidates[0].tier]} benchmark (+${fmtMoney((expansionCandidates[0].tier === "flagship" ? 8_000 : expansionCandidates[0].tier === "growth" ? 4_000 : 1_500) - expansionCandidates[0].mrr)}/mo)`
    : inquiries.length > 0
    ? `${inquiries.length} active pipeline opportunit${inquiries.length === 1 ? "y" : "ies"} — close one this week`
    : "Build pipeline — no active expansion or new opportunities in play";

  const biggestRisk  = atRisk.length > 0
    ? `${atRisk[0].name} relationship is at risk — requires direct founder touch this week`
    : renewalWatch.filter(a => (daysUntil(a.renewalDate) ?? 999) <= 14).length > 0
    ? `${renewalWatch[0].name} renews in ${daysUntil(renewalWatch[0].renewalDate) ?? 0}d — confirm renewal intent`
    : concRisk === "high"
    ? `Revenue concentrated — top client represents ${top1Pct}% of MRR`
    : "No immediate risks identified — maintain momentum";

  const biggestWin   = sortedScores.length > 0
    ? `${sortedScores[0].name} (Grade ${sortedScores[0].grade}) — strongest strategic account`
    : totalMRR > 0
    ? `${fmtMoneyCompact(totalMRR)}/mo MRR — operational revenue baseline solid`
    : "Focus on generating first retainer revenue";

  const immediatePriority = topPriorities[0]
    ? topPriorities[0].label
    : overdueReqs.length > 0
    ? `Clear ${overdueReqs.length} overdue client request${overdueReqs.length !== 1 ? "s" : ""}`
    : "Define next actions for all flagship accounts";

  // ── Key relationships ──────────────────────────────────────────────────────
  const keyRelationships = sortedScores.slice(0, 6);

  // ── Render ─────────────────────────────────────────────────────────────────

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
                  KXD OS · Founder Command Center
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.18)", marginTop: "0.125rem" }}>
                  Phase 3B · Live Payload data · Refreshes on every request
                </p>
              </div>
              <span style={{
                fontFamily: C.sans, fontWeight: 600, fontSize: "0.375rem",
                letterSpacing: "0.16em", textTransform: "uppercase" as const,
                color: "rgba(197,166,92,0.75)", background: "rgba(197,166,92,0.07)",
                border: "1px solid rgba(197,166,92,0.2)", padding: "0.2rem 0.6rem",
              }}>
                Phase 3B
              </span>
            </div>

            <div className="flex items-center gap-5">
              {([
                ["/admin/operations",          "Operations",  "rgba(255,255,255,0.3)"],
                ["/admin/operations/today",    "Today",       "rgba(255,255,255,0.3)"],
                ["/admin/operations/growth",   "Growth",      "rgba(255,255,255,0.3)"],
                ["/admin/operations/accounts", "Accounts",    C.purple],
                ["/admin/operations/creative", "Creative",    "rgba(255,255,255,0.3)"],
                ["/admin",                     "Payload",     C.goldDim],
              ] as [string, string, string][]).map(([href, label, color]) => (
                <Link key={href} href={href} style={{
                  fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em",
                  textTransform: "uppercase" as const, color, opacity: href === "/admin" ? 0.55 : 0.85,
                  textDecoration: "none",
                }}>
                  {label} →
                </Link>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>

        {/* ── Page title + momentum badge ───────────────────────────────── */}
        <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "0.875rem" }}>
            KXD OS · Founder Command Center
          </p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.875rem, 5vw, 3.25rem)", lineHeight: 1.02, color: C.cream, letterSpacing: "-0.01em" }}>
                {dateDisplay}
              </h1>
              <p style={{ fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.2)", marginTop: "0.625rem" }}>
                Loaded {timeDisplay} · All data live from Payload
              </p>
            </div>
            {/* Momentum score badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.875rem",
              background: mom.bg, border: `1px solid ${mom.border}`, padding: "0.875rem 1.375rem",
            }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: mom.color, flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.5625rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: mom.color, lineHeight: 1 }}>
                  {mom.label} — {momentumScore}
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)", marginTop: "0.375rem" }}>
                  Founder Momentum Score
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 1. Founder Snapshot KPI Strip ─────────────────────────────── */}
        <div style={{ marginBottom: "1.125rem" }}>
          <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>Founder Snapshot</Label>
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

        {/* ── 2. Revenue Goal Tracker + Momentum Score ──────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader label="Revenue Goal Tracker" sub="Annual recurring revenue vs. $1M target" />
          <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: "1.25rem" }}>

            {/* Goal progress */}
            <div style={{ background: C.bgElevated, border: `1px solid ${rev.border}`, padding: "1.75rem" }}>
              <div className="flex items-center gap-3" style={{ marginBottom: "1.5rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: rev.dot }} />
                <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.5625rem", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: rev.color }}>
                  {rev.label}
                </p>
              </div>
              {/* Numbers */}
              <div className="grid grid-cols-2" style={{ gap: "1.5rem", marginBottom: "1.5rem" }}>
                {[
                  { l: "Current ARR",    v: fmtMoneyCompact(annualProj), c: rev.color },
                  { l: "Annual Goal",    v: fmtMoneyCompact(ANNUAL_GOAL), c: C.creamMuted },
                  { l: "MRR",            v: fmtMoneyCompact(totalMRR),   c: C.cream },
                  { l: "Remaining Gap",  v: goalGap > 0 ? fmtMoneyCompact(goalGap) : "Goal met", c: goalGap > 0 ? C.red : C.green },
                ].map(({ l, v, c }) => (
                  <div key={l}>
                    <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const }}>
                      {l}
                    </p>
                    <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.375rem", color: c, marginTop: "0.25rem", letterSpacing: "-0.01em" }}>
                      {v}
                    </p>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div>
                <div className="flex justify-between" style={{ marginBottom: "0.375rem" }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>Progress to $1M</p>
                  <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.4375rem", color: rev.color }}>{goalPct}%</p>
                </div>
                <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", position: "relative" as const }}>
                  <div style={{ position: "absolute" as const, top: 0, left: 0, width: `${goalPct}%`, height: "100%", background: rev.color }} />
                </div>
                {mrrNeeded > 0 && (
                  <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.25)", marginTop: "0.5rem" }}>
                    {fmtMoney(mrrNeeded)}/mo additional MRR needed to reach goal
                  </p>
                )}
              </div>
            </div>

            {/* Momentum score breakdown */}
            <div style={{ background: mom.bg, border: `1px solid ${mom.border}`, padding: "1.75rem" }}>
              <div className="flex items-center gap-3" style={{ marginBottom: "1.25rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: mom.color }} />
                <div>
                  <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.5625rem", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: mom.color }}>
                    Momentum — {mom.label}
                  </p>
                </div>
              </div>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "3rem", color: mom.color, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "0.25rem" }}>
                {momentumScore}
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", marginBottom: "1.25rem" }}>
                / 100 composite
              </p>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", position: "relative" as const, marginBottom: "1rem" }}>
                <div style={{ position: "absolute" as const, top: 0, left: 0, width: `${momentumScore}%`, height: "100%", background: mom.color }} />
              </div>
              <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6, letterSpacing: "0.02em" }}>
                {mom.description}
              </p>
              {/* Component breakdown */}
              <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: `1px solid ${C.border}` }}>
                {[
                  { l: "Revenue Progress",  pts: Math.min(Math.round((annualProj / ANNUAL_GOAL) * 30), 30), max: 30 },
                  { l: "Pipeline Health",   pts: inquiries.length >= 5 ? 20 : inquiries.length >= 2 ? 14 : inquiries.length >= 1 ? 8 : 0, max: 20 },
                  { l: "Client Health",     pts: Math.round(healthyPct * 25), max: 25 },
                  { l: "Expansion Signal",  pts: expansionCandidates.length === 0 ? 15 : expansionCandidates.length <= 2 ? 10 : 5, max: 15 },
                  { l: "Workload Clarity",  pts: overdueReqs.length === 0 ? 10 : overdueReqs.length <= 2 ? 6 : 2, max: 10 },
                ].map(({ l, pts, max }) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", flex: 1 }}>
                      {l}
                    </p>
                    <div style={{ width: "5rem", height: "2px", background: "rgba(255,255,255,0.07)", position: "relative" as const }}>
                      <div style={{ position: "absolute" as const, top: 0, left: 0, width: `${(pts / max) * 100}%`, height: "100%", background: mom.color, opacity: 0.7 }} />
                    </div>
                    <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.4375rem", color: mom.color, width: "3rem", textAlign: "right" as const }}>
                      {pts}/{max}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Founder Priorities ─────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Founder Priorities"
            sub="Top items requiring founder attention — ranked by urgency and business impact"
          />

          {topPriorities.length === 0 ? (
            <div style={{ background: C.bgElevated, border: `1px solid rgba(94,198,140,0.22)`, padding: "1.5rem 1.75rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.green }} />
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.green }}>No priority items this week.</p>
                <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.3)", marginTop: "0.25rem", letterSpacing: "0.06em" }}>
                  Revenue is tracking, clients are healthy, and operations are clear.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "1px", background: C.border }}>
              {topPriorities.map((item, i) => {
                const urgencyColor = URGENCY_COLOR[item.urgency];
                return (
                  <div key={i} style={{ background: C.bgElevated, padding: "1.125rem 1.375rem", display: "flex", alignItems: "flex-start", gap: "1rem", borderLeft: `3px solid ${urgencyColor}` }}>
                    {/* Rank */}
                    <div style={{ width: "1.5rem", height: "1.5rem", background: `${urgencyColor}14`, border: `1px solid ${urgencyColor}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: C.sans, fontWeight: 700, fontSize: "0.5rem", color: urgencyColor }}>
                        {i + 1}
                      </span>
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      {item.href ? (
                        <Link href={item.href} style={{ textDecoration: "none" }}>
                          <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream }}>{item.label}</p>
                        </Link>
                      ) : (
                        <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream }}>{item.label}</p>
                      )}
                      <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", marginTop: "0.25rem" }}>
                        {item.sub}
                      </p>
                    </div>
                    {/* Value + urgency */}
                    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: "0.375rem", flexShrink: 0 }}>
                      {item.value && (
                        <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "0.875rem", color: C.cream }}>
                          {item.value}
                        </p>
                      )}
                      <Badge color={urgencyColor}>{item.urgency}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 4. Weekly Focus Panel ─────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader label="Weekly Focus" sub="Derived from live data across all KXD OS collections" />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: "1px", background: C.border }}>
            {[
              { type: "Biggest Opportunity", text: biggestOpp,           icon: "↑", color: C.teal },
              { type: "Biggest Risk",        text: biggestRisk,          icon: "⚠", color: C.red },
              { type: "Biggest Win",         text: biggestWin,           icon: "★", color: C.gold },
              { type: "Immediate Priority",  text: immediatePriority,    icon: "→", color: C.purple },
            ].map(({ type, text, icon, color }) => (
              <div key={type} style={{ background: C.bgElevated, padding: "1.375rem" }}>
                <div className="flex items-center gap-2" style={{ marginBottom: "0.75rem" }}>
                  <span style={{ fontFamily: C.sans, fontWeight: 700, fontSize: "0.75rem", color, opacity: 0.8 }}>{icon}</span>
                  <Label style={{ color: `${color}99` }}>{type}</Label>
                </div>
                <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, lineHeight: 1.65, letterSpacing: "0.02em" }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. Expansion Opportunities ────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Expansion Opportunities"
            sub={`${fmtMoney(expansionUpside)}/mo estimated upside across ${expansionCandidates.length + whiteSpace.length} identified opportunities`}
            href="/admin/operations/accounts"
            linkText="Accounts Intelligence →"
          />

          {(expansionCandidates.length === 0 && whiteSpace.length === 0) ? (
            <EmptyState message="No immediate expansion opportunities identified — all retainer clients are at or above tier benchmarks." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" style={{ gap: "1px", background: C.border }}>
              {/* Below-benchmark accounts */}
              {expansionCandidates.slice(0, 4).map((a) => {
                const benchmark = a.tier === "flagship" ? 8_000 : a.tier === "growth" ? 4_000 : 1_500;
                const gap = benchmark - a.mrr;
                return (
                  <div key={`exp-${a.clientId}`} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
                    <div className="flex justify-between items-start gap-2" style={{ marginBottom: "0.5rem" }}>
                      <Link href={`/admin/collections/clients/${a.clientId}`} style={{ textDecoration: "none" }}>
                        <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream }}>{a.name}</p>
                      </Link>
                      <Badge color={TIER_COLOR[a.tier] ?? C.creamMuted}>{TIER_LABEL[a.tier] ?? a.tier}</Badge>
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>
                      Retainer Growth Opportunity
                    </p>
                    <div style={{ display: "flex", gap: "1.25rem" }}>
                      <div>
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: "rgba(255,255,255,0.25)" }}>Current</p>
                        <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.creamMuted }}>{fmtMoney(a.mrr)}</p>
                      </div>
                      <div>
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: "rgba(255,255,255,0.25)" }}>Benchmark</p>
                        <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.teal }}>{fmtMoney(benchmark)}</p>
                      </div>
                      <div>
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: "rgba(255,255,255,0.25)" }}>Upside</p>
                        <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.gold }}>+{fmtMoney(gap)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* White space */}
              {whiteSpace.slice(0, 2).map((c) => (
                <div key={`ws-${c.id}`} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
                  <div className="flex justify-between items-start gap-2" style={{ marginBottom: "0.5rem" }}>
                    <Link href={`/admin/collections/clients/${c.id}`} style={{ textDecoration: "none" }}>
                      <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", color: C.cream }}>{String(c.name)}</p>
                    </Link>
                    <Badge color={TIER_COLOR[c.brandTier as string] ?? C.creamMuted}>
                      {TIER_LABEL[c.brandTier as string] ?? String(c.brandTier ?? "—")}
                    </Badge>
                  </div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>
                    White Space — No Active Projects
                  </p>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.teal }}>
                    {fmtMoney(Number(c.monthlyRetainerAmount) || 0)}<span style={{ fontSize: "0.75rem", color: C.creamMuted }}>/mo</span>
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.25)", marginTop: "0.25rem" }}>
                    Retainer active — no delivery scope open
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 6. Revenue Concentration Snapshot ────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Revenue Concentration Snapshot"
            sub="Client dependency risk across the MRR base"
          />

          <div className="grid grid-cols-1 xl:grid-cols-3" style={{ gap: "1px", background: C.border }}>
            {/* Risk status card */}
            <div style={{ background: C.bgElevated, border: `1px solid ${concColor}30`, padding: "1.5rem" }}>
              <div className="flex items-center gap-3" style={{ marginBottom: "1rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: concColor }} />
                <p style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.5625rem", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: concColor }}>
                  {concLabel}
                </p>
              </div>
              <div style={{ display: "flex", gap: "2rem", marginBottom: "1rem" }}>
                <div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Top Client</p>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.75rem", color: concColor, lineHeight: 1, marginTop: "0.25rem" }}>{top1Pct}%</p>
                </div>
                <div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Top 3</p>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.75rem", color: C.creamMuted, lineHeight: 1, marginTop: "0.25rem" }}>{top3Pct}%</p>
                </div>
              </div>
              <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", lineHeight: 1.6 }}>
                {concRisk === "high"
                  ? "Single client represents over 40% of MRR. Revenue risk if this account churns."
                  : concRisk === "moderate"
                  ? "Top client is 25–40% of MRR. Consider diversifying before scaling."
                  : "Revenue is well distributed. No single client dominates the base."}
              </p>
            </div>

            {/* MRR waterfall */}
            <div className="xl:col-span-2" style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1.5rem" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.goldDim, marginBottom: "1rem" }}>
                MRR by Account — {fmtMoney(totalMRR)}/mo total
              </p>
              {withMRR.length === 0 ? (
                <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)" }}>
                  No retainer revenue recorded.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.625rem" }}>
                  {withMRR.slice(0, 8).map((a) => {
                    const pct = totalMRR > 0 ? (a.mrr / totalMRR) * 100 : 0;
                    return (
                      <div key={a.clientId}>
                        <div className="flex justify-between" style={{ marginBottom: "0.25rem" }}>
                          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted }}>
                            {a.name}
                            <span style={{ color: TIER_COLOR[a.tier] ?? C.creamMuted, fontSize: "0.4375rem", marginLeft: "0.5rem" }}>
                              {TIER_LABEL[a.tier]}
                            </span>
                          </p>
                          <div className="flex items-center gap-2">
                            <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(255,255,255,0.3)" }}>
                              {Math.round(pct)}%
                            </p>
                            <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.cream }}>
                              {fmtMoney(a.mrr)}
                            </p>
                          </div>
                        </div>
                        <div style={{ height: "2px", background: "rgba(255,255,255,0.07)", position: "relative" as const }}>
                          <div style={{ position: "absolute" as const, top: 0, left: 0, width: `${pct}%`, height: "100%", background: TIER_COLOR[a.tier] ?? C.gold }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 7. Key Relationship Tracker ───────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Key Relationship Tracker"
            sub="Top strategic accounts by composite score — health, next actions, and expansion potential"
            href="/admin/collections/clients"
            linkText="All Clients →"
          />

          {keyRelationships.length === 0 ? (
            <EmptyState message="No active clients. Add client records to begin relationship tracking." />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: "1px", background: C.border }}>
              {keyRelationships.map((a) => {
                const benchmark = a.tier === "flagship" ? 8_000 : a.tier === "growth" ? 4_000 : 1_500;
                const upside = Math.max(benchmark - a.mrr, 0);
                return (
                  <div key={a.clientId} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>

                    {/* Header row */}
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
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ textAlign: "right" as const }}>
                          <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1rem", color: C.cream }}>
                            {fmtMoney(a.mrr)}
                          </p>
                          <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: "rgba(255,255,255,0.25)" }}>/month</p>
                        </div>
                        <div style={{ width: "2.25rem", height: "2.25rem", background: `${a.gradeColor}14`, border: `1px solid ${a.gradeColor}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                        <span style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: a.gradeColor }}>
                          {a.score}/100
                        </span>
                      </div>
                    </div>

                    {/* Next action */}
                    {a.nextAction ? (
                      <div style={{ padding: "0.5rem 0.625rem", background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, marginBottom: "0.625rem" }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: "0.2rem" }}>
                          Next Action
                        </p>
                        <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.creamMuted }}>{a.nextAction}</p>
                        {a.nextActionDue && (
                          <p style={{ fontFamily: C.sans, fontSize: "0.375rem", color: (daysUntil(a.nextActionDue) ?? 999) < 0 ? C.red : C.goldDim, marginTop: "0.2rem" }}>
                            Due {fmtDate(a.nextActionDue)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontFamily: C.sans, fontSize: "0.4375rem", color: "rgba(210,90,90,0.5)", letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
                        No next action defined
                      </p>
                    )}

                    {/* Expansion potential */}
                    {upside > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const }}>
                          Expansion potential
                        </span>
                        <span style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.4375rem", color: C.gold }}>
                          +{fmtMoney(upside)}/mo
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 8. Quick Actions ──────────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>Quick Actions</Label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}>
            {([
              { label: "Operations",   sub: "Command center",          href: "/admin/operations" },
              { label: "Today",        sub: "Daily dashboard",         href: "/admin/operations/today" },
              { label: "Growth",       sub: "Pipeline intelligence",   href: "/admin/operations/growth" },
              { label: "Accounts",     sub: "Strategic intelligence",  href: "/admin/operations/accounts" },
              { label: "Creative",     sub: "Campaigns & assets",      href: "/admin/operations/creative" },
              { label: "Clients",      sub: "Client records",          href: "/admin/collections/clients" },
              { label: "Retainers",    sub: "Revenue records",         href: "/admin/collections/retainers" },
              { label: "Requests",     sub: "Client requests",         href: "/admin/collections/client-requests" },
              { label: "New Inquiry",  sub: "Start project form",      href: "/start-project" },
              { label: "KXD Website",  sub: "Live site",               href: "/" },
            ] as { label: string; sub: string; href: string }[]).map((action) => (
              <Link key={action.href} href={action.href} style={{ background: C.bgElevated, padding: "1.125rem 1rem", display: "block", textDecoration: "none" }}>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.5625rem", color: C.creamMuted, letterSpacing: "0.02em", lineHeight: 1.3 }}>
                  {action.label}
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.22)", marginTop: "0.25rem", textTransform: "uppercase" as const }}>
                  {action.sub}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{ marginTop: "2.5rem", padding: "1rem 1.25rem", background: C.goldFaint, border: `1px solid ${C.borderGold}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: "0.5rem" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.22)" }}>
            KXD OS · Founder Command Center · Phase 3B · Live Payload data · Refreshes on each request
          </p>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" as const }}>
            {([
              ["/admin/operations",           "Operations"],
              ["/admin/operations/today",     "Today"],
              ["/admin/operations/growth",    "Growth"],
              ["/admin/operations/accounts",  "Accounts"],
              ["/admin/operations/creative",  "Creative"],
              ["/admin/collections/clients",  "Clients"],
              ["/admin/collections/retainers","Retainers"],
              ["/admin",                      "Payload"],
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
