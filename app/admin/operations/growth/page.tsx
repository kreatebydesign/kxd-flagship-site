/**
 * /admin/operations/growth
 * KXD OS — Growth Intelligence
 * Phase 2G
 *
 * Internal growth layer for Kreate by Design. Tracks inbound leads,
 * proposal pipeline, inquiry quality, revenue opportunities, and SEO
 * content coverage across the KXD Journal.
 *
 * Architecture:
 *   — export const dynamic = "force-dynamic"  (live on every request)
 *   — 6 parallel Payload queries via Promise.allSettled
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
  bgPure:     "#000000",
  bgBase:     "#080808",
  bgElevated: "#111111",
  bgCard:     "#141414",
  gold:       "#C5A65C",
  goldDim:    "rgba(197,166,92,0.55)",
  goldFaint:  "rgba(197,166,92,0.08)",
  cream:      "#f8f3ea",
  creamMuted: "#bfb7aa",
  red:        "#d25a5a",
  redFaint:   "rgba(210,90,90,0.08)",
  yellow:     "#f0be50",
  green:      "#5ec68c",
  teal:       "#96d2c8",
  blue:       "#8a9bd2",
  purple:     "#b48cdc",
  border:     "rgba(255,255,255,0.07)",
  borderGold: "rgba(197,166,92,0.22)",
  borderRed:  "rgba(210,90,90,0.25)",
  serif:      "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans:       "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return "—"; }
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

// ── Data maps ─────────────────────────────────────────────────────────────────

// Contact form (Inquiries) budget range midpoints
const BUDGET_MIDPOINTS: Record<string, number> = {
  "under-5k":  3_500,
  "5k-10k":    7_500,
  "10k-25k":  17_500,
  "25k-50k":  37_500,
  "50k-plus": 65_000,
};

// Start-project (ProjectInquiries) investment range midpoints
const INVESTMENT_MIDPOINTS: Record<string, number> = {
  "under-10k":        7_500,
  "10k-25k":         17_500,
  "25k-50k":         37_500,
  "50k-100k":        75_000,
  "100k-plus":      125_000,
  "not-determined":       0,
};

const BUDGET_LABELS: Record<string, string> = {
  "under-5k":       "Under $5K",
  "5k-10k":         "$5K – $10K",
  "10k-25k":        "$10K – $25K",
  "25k-50k":        "$25K – $50K",
  "50k-plus":       "$50K+",
  "under-10k":      "Under $10K",
  "50k-100k":       "$50K – $100K",
  "100k-plus":      "$100K+",
  "not-determined": "Not Determined",
};

const SERVICE_LABELS: Record<string, string> = {
  "luxury-website-experiences": "Luxury Websites",
  "brand-systems-identity":     "Brand Systems",
  "growth-infrastructure":      "Growth Infrastructure",
  "enterprise-platforms":       "Enterprise Platforms",
  "ongoing-partnership":        "Retainer Partnership",
  "general":                    "General / Unsure",
};

const SERVICE_COLORS: Record<string, string> = {
  "luxury-website-experiences": "#C5A65C",
  "brand-systems-identity":     "#96d2c8",
  "growth-infrastructure":      "#5ec68c",
  "enterprise-platforms":       "#8a9bd2",
  "ongoing-partnership":        "#b48cdc",
  "general":                    "rgba(255,255,255,0.25)",
};

const SEO_CATEGORIES: Array<{ value: string; label: string; target: number }> = [
  { value: "luxury-web-design",    label: "Luxury Web Design",    target: 5 },
  { value: "operational-systems",  label: "Operational Systems",  target: 4 },
  { value: "hospitality-growth",   label: "Hospitality Growth",   target: 4 },
  { value: "motorsports-strategy", label: "Motorsports Strategy", target: 3 },
  { value: "brand-systems",        label: "Brand Systems",        target: 4 },
  { value: "founder-perspectives", label: "Founder Perspectives", target: 3 },
];

// Active pipeline statuses per collection
const INQUIRY_ACTIVE = new Set(["new", "reviewed", "in-progress", "proposal-sent"]);
const PI_ACTIVE      = new Set(["new", "reviewing", "discovery", "proposal"]);

// Budget tier ordering for forecast table
const TIER_ORDER = [
  "100k-plus", "50k-100k", "50k-plus",
  "25k-50k", "10k-25k", "5k-10k",
  "under-10k", "under-5k", "not-determined",
];

// ── Scored lead type ──────────────────────────────────────────────────────────

interface ScoredLead {
  id:           number;
  type:         "inquiry" | "project-inquiry";
  name:         string;
  company:      string;
  service:      string;
  budgetKey:    string;
  timeline:     string;
  status:       string;
  score:        number;
  estValue:     number;
  followUpDate: string | null;
  nextStep:     string | null;
  createdAt:    string;
}

// Quality score: contact form (Inquiries)
// Max 10 pts: budget(4) + timeline(2) + service type(1) + notes(1) + stage(2)
function scoreInquiry(doc: AnyDoc): ScoredLead {
  let s = 0;
  const budget = (doc.budget as string) ?? "";
  if      (budget === "50k-plus") s += 4;
  else if (budget === "25k-50k")  s += 3;
  else if (budget === "10k-25k")  s += 2;
  else if (budget === "5k-10k")   s += 1;

  const tl = (doc.timeline as string) ?? "";
  if      (tl === "immediate")      s += 2;
  else if (tl === "within-30-days") s += 1;

  const iType = (doc.inquiryType as string) ?? "general";
  if (iType && iType !== "general") s += 1;

  const notes = (doc.internalNotes as string) ?? "";
  if (notes.trim().length > 5) s += 1;

  const status = (doc.status as string) ?? "";
  if      (status === "proposal-sent") s += 2;
  else if (status === "in-progress")   s += 1;

  return {
    id:           doc.id as number,
    type:         "inquiry",
    name:         (doc.name    as string) || "—",
    company:      (doc.company as string) || "—",
    service:      SERVICE_LABELS[iType] ?? iType ?? "General",
    budgetKey:    budget || "unknown",
    timeline:     tl || "unknown",
    status,
    score:        Math.min(s, 10),
    estValue:     BUDGET_MIDPOINTS[budget] ?? 0,
    followUpDate: (doc.followUpDate as string) ?? null,
    nextStep:     (doc.nextStep    as string) ?? null,
    createdAt:    (doc.createdAt   as string) ?? "",
  };
}

// Quality score: start-project intake (ProjectInquiries)
// Max 10 pts: investment(4) + timeline(2) + services(1) + goals(1) + stage(2)
function scoreProjectInquiry(doc: AnyDoc): ScoredLead {
  let s = 0;
  const inv = (doc.investmentRange as string) ?? "";
  if      (inv === "100k-plus") s += 4;
  else if (inv === "50k-100k")  s += 3;
  else if (inv === "25k-50k")   s += 2;
  else if (inv === "10k-25k")   s += 1;

  const tl = (doc.timeline as string) ?? "";
  if      (tl === "immediate")      s += 2;
  else if (tl === "within-30-days") s += 1;

  const svcs = (doc.servicesInterested as string) ?? "";
  if (svcs.trim().length > 0) s += 1;

  const goals = (doc.businessGoals as string) ?? "";
  if (goals.trim().length > 20) s += 1;

  const status = (doc.status as string) ?? "";
  if      (status === "proposal")  s += 2;
  else if (status === "discovery") s += 1;

  return {
    id:           doc.id as number,
    type:         "project-inquiry",
    name:         (doc.contactName as string) || "—",
    company:      (doc.companyName as string) || "—",
    service:      svcs || "Project Application",
    budgetKey:    inv || "unknown",
    timeline:     tl || "unknown",
    status,
    score:        Math.min(s, 10),
    estValue:     INVESTMENT_MIDPOINTS[inv] ?? 0,
    followUpDate: null,
    nextStep:     null,
    createdAt:    (doc.createdAt as string) ?? "",
  };
}

// ── Growth Score ──────────────────────────────────────────────────────────────

type GrowthScore = "strong" | "active" | "building" | "quiet";

const GROWTH_CFG: Record<GrowthScore, {
  label: string; color: string; bg: string; border: string; dot: string; description: string;
}> = {
  strong: {
    label:       "Strong",
    color:       "#5ec68c",
    bg:          "rgba(94,198,140,0.06)",
    border:      "rgba(94,198,140,0.28)",
    dot:         "#5ec68c",
    description: "High-value pipeline active. Prioritize close and conversion.",
  },
  active: {
    label:       "Active",
    color:       "#C5A65C",
    bg:          "rgba(197,166,92,0.06)",
    border:      "rgba(197,166,92,0.28)",
    dot:         "#C5A65C",
    description: "Pipeline in motion. Follow up on open proposals.",
  },
  building: {
    label:       "Building",
    color:       "#96d2c8",
    bg:          "rgba(150,210,200,0.06)",
    border:      "rgba(150,210,200,0.28)",
    dot:         "#96d2c8",
    description: "Early-stage leads present. Nurture and qualify.",
  },
  quiet: {
    label:       "Quiet",
    color:       "rgba(255,255,255,0.3)",
    bg:          "rgba(255,255,255,0.03)",
    border:      "rgba(255,255,255,0.1)",
    dot:         "rgba(255,255,255,0.25)",
    description: "No active pipeline. Focus on content and outreach.",
  },
};

function computeGrowthScore(pipelineValue: number, activeLeads: number): GrowthScore {
  if (pipelineValue >= 100_000 || activeLeads >= 8) return "strong";
  if (pipelineValue >=  30_000 || activeLeads >= 3) return "active";
  if (activeLeads >= 1)                              return "building";
  return "quiet";
}

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "new":           { label: "New",          color: "#C5A65C", bg: "rgba(197,166,92,0.08)",  border: "rgba(197,166,92,0.3)" },
  "reviewed":      { label: "Reviewed",     color: "#96d2c8", bg: "rgba(150,210,200,0.08)", border: "rgba(150,210,200,0.3)" },
  "reviewing":     { label: "Reviewing",    color: "#96d2c8", bg: "rgba(150,210,200,0.08)", border: "rgba(150,210,200,0.3)" },
  "discovery":     { label: "Discovery",    color: "#8a9bd2", bg: "rgba(138,155,210,0.08)", border: "rgba(138,155,210,0.3)" },
  "in-progress":   { label: "In Progress",  color: "#f0be50", bg: "rgba(240,190,80,0.08)",  border: "rgba(240,190,80,0.3)" },
  "proposal":      { label: "Proposal",     color: "#b48cdc", bg: "rgba(180,140,220,0.08)", border: "rgba(180,140,220,0.3)" },
  "proposal-sent": { label: "Proposal Out", color: "#b48cdc", bg: "rgba(180,140,220,0.08)", border: "rgba(180,140,220,0.3)" },
  "active":        { label: "Active",       color: "#5ec68c", bg: "rgba(94,198,140,0.08)",  border: "rgba(94,198,140,0.3)" },
  "onboarding":    { label: "Onboarding",   color: "#5ec68c", bg: "rgba(94,198,140,0.08)",  border: "rgba(94,198,140,0.3)" },
  "retainer":      { label: "Retainer",     color: "#5ec68c", bg: "rgba(94,198,140,0.08)",  border: "rgba(94,198,140,0.3)" },
  "won":           { label: "Won",          color: "#5ec68c", bg: "rgba(94,198,140,0.08)",  border: "rgba(94,198,140,0.3)" },
  "lost":          { label: "Lost",         color: "#d25a5a", bg: "rgba(210,90,90,0.08)",   border: "rgba(210,90,90,0.3)" },
  "paused":        { label: "Paused",       color: "#888880", bg: "rgba(136,136,128,0.08)", border: "rgba(136,136,128,0.3)" },
  "closed":        { label: "Closed",       color: "#888880", bg: "rgba(136,136,128,0.08)", border: "rgba(136,136,128,0.3)" },
  "completed":     { label: "Completed",    color: "#5ec68c", bg: "rgba(94,198,140,0.08)",  border: "rgba(94,198,140,0.3)" },
};

// ── Primitive UI components ───────────────────────────────────────────────────

function Label({
  children, style,
}: {
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <p style={{
      fontFamily: C.sans, fontWeight: 400,
      fontSize: "0.4375rem", letterSpacing: "0.14em",
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.3)", ...style,
    }}>
      {children}
    </p>
  );
}

function Badge({ status }: { status: string }) {
  const b = STATUS_BADGE[status] ?? {
    label:  status,
    color:  "rgba(255,255,255,0.3)",
    bg:     "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)",
  };
  return (
    <span style={{
      fontFamily: C.sans, fontWeight: 500,
      fontSize: "0.375rem", letterSpacing: "0.14em",
      textTransform: "uppercase" as const,
      color: b.color, background: b.bg, border: `1px solid ${b.border}`,
      padding: "0.2rem 0.65rem",
      whiteSpace: "nowrap" as const, display: "inline-block",
    }}>
      {b.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color  = score >= 8 ? "#5ec68c" : score >= 5 ? "#C5A65C" : "rgba(255,255,255,0.28)";
  const bg     = score >= 8 ? "rgba(94,198,140,0.08)" : score >= 5 ? "rgba(197,166,92,0.08)" : "rgba(255,255,255,0.04)";
  const border = score >= 8 ? "rgba(94,198,140,0.3)" : score >= 5 ? "rgba(197,166,92,0.3)" : "rgba(255,255,255,0.1)";
  const label  = score >= 8 ? "High" : score >= 5 ? "Medium" : score > 0 ? "Low" : "—";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
      <span style={{
        fontFamily: C.sans, fontWeight: 700, fontSize: "0.75rem",
        color, lineHeight: 1, minWidth: "1rem", textAlign: "right" as const,
      }}>
        {score}
      </span>
      <span style={{
        fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.12em",
        textTransform: "uppercase" as const,
        color, background: bg, border: `1px solid ${border}`,
        padding: "0.18rem 0.5rem", whiteSpace: "nowrap" as const, display: "inline-block",
      }}>
        {label}
      </span>
    </div>
  );
}

function SectionHeader({
  label, count, href, linkText,
}: {
  label: string; count?: number; href?: string; linkText?: string;
}) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
      <div className="flex items-baseline gap-2">
        <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>{label}</Label>
        {count !== undefined && count > 0 && (
          <span style={{
            fontFamily: C.sans, fontSize: "0.375rem", letterSpacing: "0.1em",
            color: C.goldDim, background: C.goldFaint,
            border: `1px solid ${C.borderGold}`, padding: "0.15rem 0.5rem",
            display: "inline-block",
          }}>
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link href={href} style={{
          fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: "rgba(255,255,255,0.22)", textDecoration: "none",
        }}>
          {linkText ?? "View →"}
        </Link>
      )}
    </div>
  );
}

function Card({
  children, style,
}: {
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, ...style }}>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      background: C.bgElevated, border: `1px solid ${C.border}`,
      padding: "2rem 1.5rem", textAlign: "center" as const,
    }}>
      <p style={{
        fontFamily: C.sans, fontSize: "0.5625rem", letterSpacing: "0.06em",
        color: "rgba(255,255,255,0.2)", fontStyle: "italic",
      }}>
        {message}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GrowthPage() {
  const now      = new Date();
  const todayISO = now.toISOString();

  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });

  // ── Parallel Payload queries ─────────────────────────────────────────────

  let inquiries:       AnyDoc[] = [];
  let projInquiries:   AnyDoc[] = [];
  let insights:        AnyDoc[] = [];
  let portfolioProjects: AnyDoc[] = [];
  let activeRetainers: AnyDoc[] = [];
  let overdueFollowUps: AnyDoc[] = [];

  try {
    const payload = await getPayload({ config });

    const [
      inquiriesR,
      projInquiriesR,
      insightsR,
      projectsR,
      retainersR,
      followUpsR,
    ] = await Promise.allSettled([

      // 1. Contact form leads — all non-archived/spam
      payload.find({
        collection: "inquiries",
        depth: 0, limit: 200,
        where: { status: { not_in: ["archived", "spam"] } },
        sort: "-createdAt",
      }),

      // 2. Start-project intake — all non-closed/completed
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "project-inquiries" as any,
        depth: 0, limit: 100,
        where: { status: { not_in: ["closed", "completed"] } },
        sort: "-createdAt",
      }),

      // 3. Published insights — SEO content coverage
      payload.find({
        collection: "insights",
        depth: 0, limit: 100,
        where: { status: { equals: "published" } },
        sort: "-publishedAt",
      }),

      // 4. Published portfolio projects
      payload.find({
        collection: "projects",
        depth: 0, limit: 50,
        where: { status: { equals: "published" } },
      }),

      // 5. Active retainers — MRR base
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "retainers" as any,
        depth: 0, limit: 50,
        where: { billingStatus: { in: ["active", "current"] } },
      }),

      // 6. Overdue follow-ups — Inquiries with past followUpDate
      payload.find({
        collection: "inquiries",
        depth: 0, limit: 30,
        where: {
          and: [
            { followUpDate: { less_than_equal: todayISO } },
            { status: { not_in: ["won", "lost", "archived", "spam"] } },
          ],
        },
        sort: "followUpDate",
      }),
    ]);

    if (inquiriesR.status     === "fulfilled") inquiries         = inquiriesR.value.docs     as AnyDoc[];
    if (projInquiriesR.status === "fulfilled") projInquiries     = projInquiriesR.value.docs as AnyDoc[];
    if (insightsR.status      === "fulfilled") insights          = insightsR.value.docs      as AnyDoc[];
    if (projectsR.status      === "fulfilled") portfolioProjects = projectsR.value.docs      as AnyDoc[];
    if (retainersR.status     === "fulfilled") activeRetainers   = retainersR.value.docs     as AnyDoc[];
    if (followUpsR.status     === "fulfilled") overdueFollowUps  = followUpsR.value.docs     as AnyDoc[];

  } catch {
    // Payload unavailable — all sections degrade to their empty states
  }

  // ── Computed analytics ───────────────────────────────────────────────────

  // Active pipeline
  const activeInquiries     = inquiries.filter(i => INQUIRY_ACTIVE.has(i.status as string));
  const activeProjInquiries = projInquiries.filter(p => PI_ACTIVE.has(p.status as string));

  // Won / converted (all-time)
  const wonInquiries     = inquiries.filter(i => i.status === "won");
  const wonProjInquiries = projInquiries.filter(p =>
    ["active", "onboarding", "retainer"].includes(p.status as string)
  );

  // Quality-scored leads (active pipeline only), sorted best → worst
  const scoredLeads: ScoredLead[] = [
    ...activeInquiries.map(scoreInquiry),
    ...activeProjInquiries.map(scoreProjectInquiry),
  ].sort((a, b) => b.score - a.score);

  const pipelineValue = scoredLeads.reduce((sum, l) => sum + l.estValue, 0);
  const avgLeadValue  = scoredLeads.length > 0
    ? Math.round(pipelineValue / scoredLeads.length)
    : 0;

  // Proposals currently out
  const proposalsOut = inquiries.filter(i => i.status === "proposal-sent").length
                     + projInquiries.filter(p => p.status === "proposal").length;

  // MRR base from active retainers
  const mrrBase = activeRetainers.reduce(
    (sum, r) => sum + ((r.monthlyAmount as number) ?? 0), 0
  );

  // Founder Opportunities: quality ≥ 8 AND estimated value ≥ $20K
  const founderOpportunities = scoredLeads.filter(
    l => l.score >= 8 && l.estValue >= 20_000
  );

  // Lead pipeline funnel stages
  const funnelStages = [
    { label: "New",         iStatuses: ["new"],            pStatuses: ["new"],        color: C.gold   },
    { label: "In Review",   iStatuses: ["reviewed"],       pStatuses: ["reviewing"],  color: C.teal   },
    { label: "Discovery",   iStatuses: ["in-progress"],    pStatuses: ["discovery"],  color: C.blue   },
    { label: "Proposal Out",iStatuses: ["proposal-sent"],  pStatuses: ["proposal"],   color: C.purple },
  ];

  const funnelData = funnelStages.map(stage => {
    const iLeads = inquiries.filter(i =>
      stage.iStatuses.includes(i.status as string)
    ).map(scoreInquiry);
    const pLeads = projInquiries.filter(p =>
      stage.pStatuses.includes(p.status as string)
    ).map(scoreProjectInquiry);
    const all   = [...iLeads, ...pLeads];
    const value = all.reduce((s, l) => s + l.estValue, 0);
    return { label: stage.label, count: all.length, value, color: stage.color };
  });

  // Service demand breakdown (Inquiries only — structured inquiryType field)
  const svcMap: Record<string, number> = {};
  for (const inq of inquiries) {
    const t = (inq.inquiryType as string) ?? "general";
    svcMap[t] = (svcMap[t] ?? 0) + 1;
  }
  const svcRows = Object.entries(svcMap)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({
      type, label: SERVICE_LABELS[type] ?? type, count,
    }));
  const maxSvcCount = Math.max(...svcRows.map(r => r.count), 1);

  // Revenue opportunity forecast — pipeline by budget tier
  const tierMap: Record<string, { count: number; totalValue: number }> = {};
  for (const lead of scoredLeads) {
    if (!tierMap[lead.budgetKey]) tierMap[lead.budgetKey] = { count: 0, totalValue: 0 };
    tierMap[lead.budgetKey].count      += 1;
    tierMap[lead.budgetKey].totalValue += lead.estValue;
  }
  const forecastRows = TIER_ORDER
    .filter(t => tierMap[t])
    .map(t => ({
      tier:       t,
      label:      BUDGET_LABELS[t] ?? t,
      count:      tierMap[t].count,
      totalValue: tierMap[t].totalValue,
      projected:  Math.round(tierMap[t].totalValue * 0.3),
    }));

  // SEO content coverage — insights per category vs target
  const insightCounts: Record<string, number> = {};
  for (const ins of insights) {
    const cat = (ins.category as string) ?? "unknown";
    insightCounts[cat] = (insightCounts[cat] ?? 0) + 1;
  }
  const seoCoverageRows = SEO_CATEGORIES.map(cat => {
    const count  = insightCounts[cat.value] ?? 0;
    const status =
      count === 0        ? "gap"      :
      count < 2          ? "minimal"  :
      count < cat.target ? "building" :
      "strong";
    return { ...cat, count, status };
  });
  const seoGapCount = seoCoverageRows.filter(
    r => r.status === "gap" || r.status === "minimal"
  ).length;

  // Growth Score
  const growthScore = computeGrowthScore(pipelineValue, scoredLeads.length);
  const growth      = GROWTH_CFG[growthScore];

  // KPI strip
  const KPI = [
    {
      label:       "Active Pipeline",
      value:       String(scoredLeads.length),
      sub:         "Open leads",
      alert:       false,
      accentColor: C.cream,
    },
    {
      label:       "Pipeline Value",
      value:       fmtMoney(pipelineValue),
      sub:         "Est. opportunity",
      alert:       pipelineValue > 0,
      accentColor: C.gold,
    },
    {
      label:       "Proposals Out",
      value:       String(proposalsOut),
      sub:         "Awaiting decision",
      alert:       proposalsOut > 0,
      accentColor: C.purple,
    },
    {
      label:       "Won / Converted",
      value:       String(wonInquiries.length + wonProjInquiries.length),
      sub:         "All-time total",
      alert:       false,
      accentColor: C.green,
    },
    {
      label:       "Follow-up Overdue",
      value:       String(overdueFollowUps.length),
      sub:         "Past follow-up date",
      alert:       overdueFollowUps.length > 0,
      accentColor: C.red,
    },
    {
      label:       "MRR Base",
      value:       mrrBase > 0 ? fmtMoney(mrrBase) : "$0",
      sub:         "Active retainers",
      alert:       false,
      accentColor: C.green,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      background: C.bgBase, minHeight: "100vh", color: C.cream,
      fontFamily: C.sans, WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: C.bgPure, borderBottom: `1px solid ${C.gold}40`,
      }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-4">
              <KxdLogo />
              <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.375rem" }}>◆</span>
              <div>
                <p style={{
                  fontFamily: C.sans, fontWeight: 500, fontSize: "0.5625rem",
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: C.creamMuted, lineHeight: 1,
                }}>
                  Growth
                </p>
                <p className="hidden sm:block" style={{
                  fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.24)",
                  marginTop: "0.35rem",
                }}>
                  Growth Intelligence
                </p>
              </div>
              <span style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.375rem",
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(197,166,92,0.75)", background: "rgba(197,166,92,0.07)",
                border: "1px solid rgba(197,166,92,0.2)", padding: "0.2rem 0.6rem",
              }}>
                Phase 2G
              </span>
            </div>

            <div className="flex items-center gap-5">
              <Link href="/admin/operations/executive" style={{
                fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                textDecoration: "none",
              }}>
                ← Operations
              </Link>
              <Link href="/admin/operations/today" style={{
                fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                textDecoration: "none",
              }}>
                Today →
              </Link>
              <Link href="/admin/operations/accounts" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.5rem",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: C.purple, opacity: 0.8, textDecoration: "none",
              }}>
                Accounts →
              </Link>
              <Link href="/admin/operations/founder" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.5rem",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: C.gold, opacity: 0.8, textDecoration: "none",
              }}>
                Founder →
              </Link>
              <Link href="/admin" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.5rem",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: C.gold, opacity: 0.55, textDecoration: "none",
              }}>
                Payload →
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>

        {/* ── 1. Page header + Growth Score ─────────────────────────────── */}
        <div style={{
          marginBottom: "2.5rem", paddingBottom: "2rem",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <p style={{
            fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.2em",
            textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem",
          }}>
            KXD OS · Growth Intelligence
          </p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 style={{
                fontFamily: C.serif, fontWeight: 300,
                fontSize: "clamp(1.875rem, 5vw, 3.25rem)",
                lineHeight: 1.02, color: C.cream, letterSpacing: "-0.01em",
              }}>
                {dateDisplay}
              </h1>
              <p style={{
                fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.2)", marginTop: "0.625rem",
              }}>
                Loaded {timeDisplay} · Refreshes on each page request
              </p>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.875rem",
              background: growth.bg, border: `1px solid ${growth.border}`,
              padding: "0.875rem 1.375rem",
            }}>
              <div style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: growth.dot, flexShrink: 0,
              }} />
              <div>
                <p style={{
                  fontFamily: C.sans, fontWeight: 600, fontSize: "0.5625rem",
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  color: growth.color, lineHeight: 1,
                }}>
                  {growth.label}
                </p>
                <p style={{
                  fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.04em",
                  color: "rgba(255,255,255,0.3)", marginTop: "0.375rem",
                }}>
                  {growth.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. KPI Strip ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: "0.875rem" }}>
          <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>Growth Summary</Label>
        </div>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
          style={{
            gap: "1px", background: C.border,
            border: `1px solid ${C.border}`, marginBottom: "2.5rem",
          }}
        >
          {KPI.map((kpi) => (
            <div key={kpi.label} style={{ background: C.bgElevated, padding: "1.375rem 1.5rem" }}>
              <Label>{kpi.label}</Label>
              <p style={{
                fontFamily: C.serif, fontWeight: 300,
                fontSize: "clamp(1.375rem, 2.2vw, 1.875rem)",
                lineHeight: 1, color: kpi.alert ? kpi.accentColor : C.cream,
                marginTop: "0.625rem", letterSpacing: "-0.01em",
              }}>
                {kpi.value}
              </p>
              <p style={{
                fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.22)", marginTop: "0.375rem",
              }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── 3. Lead Pipeline ──────────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Lead Pipeline"
            count={scoredLeads.length}
            href="/admin/collections/inquiries"
            linkText="Manage Leads →"
          />
          {scoredLeads.length === 0 ? (
            <EmptyState message="No active leads in the pipeline. Leads from /contact and /start-project will appear here." />
          ) : (
            <div>
              {/* Funnel stage cards */}
              <div
                className="grid grid-cols-2 sm:grid-cols-4"
                style={{
                  gap: "1px", background: C.border,
                  border: `1px solid ${C.border}`,
                }}
              >
                {funnelData.map(stage => (
                  <div key={stage.label} style={{ background: C.bgElevated, padding: "1.375rem 1.5rem" }}>
                    <div style={{
                      width: "18px", height: "2px",
                      background: stage.color, marginBottom: "0.875rem",
                    }} />
                    <Label>{stage.label}</Label>
                    <p style={{
                      fontFamily: C.serif, fontWeight: 300,
                      fontSize: "clamp(1.375rem, 2.2vw, 1.875rem)",
                      lineHeight: 1,
                      color: stage.count > 0 ? stage.color : "rgba(255,255,255,0.2)",
                      marginTop: "0.5rem", letterSpacing: "-0.01em",
                    }}>
                      {stage.count}
                    </p>
                    <p style={{
                      fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.06em",
                      color: "rgba(255,255,255,0.22)", marginTop: "0.375rem",
                    }}>
                      {stage.count > 0 ? fmtMoney(stage.value) : "—"}
                    </p>
                  </div>
                ))}
              </div>
              {/* Pipeline summary bar */}
              <div style={{
                background: C.bgElevated, border: `1px solid ${C.border}`,
                borderTop: "none", padding: "0.875rem 1.5rem",
                display: "flex", justifyContent: "space-between",
                alignItems: "center", gap: "1rem", flexWrap: "wrap" as const,
              }}>
                <p style={{
                  fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const,
                }}>
                  Total active pipeline · {scoredLeads.length} {scoredLeads.length === 1 ? "lead" : "leads"}
                  {avgLeadValue > 0 ? ` · Avg. ${fmtMoney(avgLeadValue)} / lead` : ""}
                </p>
                <p style={{
                  fontFamily: C.sans, fontWeight: 500, fontSize: "0.875rem",
                  color: C.gold, letterSpacing: "0.02em",
                }}>
                  {fmtMoney(pipelineValue)}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── 4. Inquiry Quality — Top Leads ────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Inquiry Quality — Top Leads"
            count={scoredLeads.length}
            href="/admin/collections/inquiries"
            linkText="View All →"
          />
          {scoredLeads.length === 0 ? (
            <EmptyState message="No scored leads yet. Inquiries via /contact or /start-project will appear here." />
          ) : (
            <Card>
              {scoredLeads.slice(0, 12).map((lead, i) => (
                <div
                  key={`${lead.type}-${lead.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: "0",
                    borderBottom: i < Math.min(scoredLeads.length, 12) - 1
                      ? `1px solid rgba(255,255,255,0.04)` : "none",
                    borderLeft: lead.score >= 8
                      ? `3px solid ${C.green}`
                      : lead.score >= 5
                        ? `3px solid ${C.gold}`
                        : `3px solid transparent`,
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: "2.5rem", padding: "0.875rem 0 0.875rem 1.125rem",
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.08em",
                      color: "rgba(255,255,255,0.18)",
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  {/* Company + name */}
                  <div style={{ flex: "1 1 0", minWidth: 0, padding: "0.875rem 0.75rem" }}>
                    <p style={{
                      fontFamily: C.sans, fontSize: "0.75rem",
                      color: C.cream, lineHeight: 1.3,
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                    }}>
                      {lead.company !== "—" ? lead.company : lead.name}
                    </p>
                    <p style={{
                      fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.04em",
                      color: "rgba(255,255,255,0.25)", marginTop: "0.2rem",
                    }}>
                      {lead.name !== "—" && lead.name !== lead.company ? `${lead.name} · ` : ""}
                      {lead.type === "project-inquiry" ? "Application" : "Contact"}
                    </p>
                  </div>
                  {/* Service */}
                  <div style={{
                    flex: "1 1 0", minWidth: 0,
                    padding: "0.875rem 0.75rem",
                    display: "none",
                  }}
                    className="sm:block"
                  >
                    <p style={{
                      fontFamily: C.sans, fontSize: "0.5625rem",
                      color: "rgba(255,255,255,0.4)",
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                    }}>
                      {lead.service.length > 22
                        ? lead.service.substring(0, 22) + "…"
                        : lead.service}
                    </p>
                  </div>
                  {/* Est. value */}
                  <div style={{
                    width: "6rem", padding: "0.875rem 0.75rem", flexShrink: 0,
                    display: "none",
                  }}
                    className="lg:block"
                  >
                    <p style={{
                      fontFamily: C.sans, fontSize: "0.6875rem",
                      color: lead.estValue > 0 ? C.gold : "rgba(255,255,255,0.2)",
                    }}>
                      {lead.estValue > 0 ? fmtMoney(lead.estValue) : "—"}
                    </p>
                  </div>
                  {/* Status + Score */}
                  <div style={{
                    padding: "0.875rem 1.125rem 0.875rem 0.75rem",
                    display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0,
                  }}>
                    <div className="hidden sm:block">
                      <Badge status={lead.status} />
                    </div>
                    <ScoreBadge score={lead.score} />
                  </div>
                </div>
              ))}
              {scoredLeads.length > 12 && (
                <div style={{
                  padding: "0.625rem 1.125rem",
                  borderTop: `1px solid rgba(255,255,255,0.04)`,
                  background: "rgba(255,255,255,0.01)",
                }}>
                  <p style={{
                    fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.2)", textTransform: "uppercase" as const,
                  }}>
                    +{scoredLeads.length - 12} more leads — view in Payload
                  </p>
                </div>
              )}
            </Card>
          )}
        </section>

        {/* ── 5. Founder Opportunities ──────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Founder Opportunities"
            count={founderOpportunities.length || undefined}
            href="/admin/collections/inquiries"
            linkText="All Leads →"
          />
          {founderOpportunities.length === 0 ? (
            <div style={{
              background: C.bgElevated, border: `1px solid ${C.border}`,
              padding: "1.375rem 1.5rem",
            }}>
              <p style={{
                fontFamily: C.sans, fontSize: "0.5625rem", letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.22)", fontStyle: "italic",
              }}>
                No current opportunities meeting the threshold — Quality Score ≥ 8 and Est. Value ≥ $20K.
                Continue qualifying active pipeline.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-3"
              style={{ background: C.borderGold }}
            >
              {founderOpportunities.map(lead => (
                <div
                  key={`founder-${lead.type}-${lead.id}`}
                  style={{
                    background: C.bgElevated,
                    padding: "1.375rem 1.5rem",
                    borderLeft: `3px solid ${C.green}`,
                  }}
                >
                  <div
                    className="flex items-start justify-between gap-2"
                    style={{ marginBottom: "1rem" }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{
                        fontFamily: C.sans, fontWeight: 500, fontSize: "0.9375rem",
                        color: C.cream, lineHeight: 1.2,
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap" as const,
                      }}>
                        {lead.company !== "—" ? lead.company : lead.name}
                      </p>
                      {lead.name !== "—" && lead.name !== lead.company && (
                        <p style={{
                          fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.04em",
                          color: "rgba(255,255,255,0.28)", marginTop: "0.25rem",
                        }}>
                          {lead.name}
                        </p>
                      )}
                    </div>
                    <ScoreBadge score={lead.score} />
                  </div>

                  <div style={{
                    display: "flex", flexDirection: "column" as const, gap: "0.5rem",
                    marginBottom: "1rem",
                  }}>
                    <div className="flex items-center justify-between gap-2">
                      <Label>Est. Value</Label>
                      <p style={{
                        fontFamily: C.sans, fontWeight: 600, fontSize: "0.875rem",
                        color: C.gold,
                      }}>
                        {fmtMoney(lead.estValue)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>Service</Label>
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted,
                        textAlign: "right" as const, maxWidth: "10rem",
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap" as const,
                      }}>
                        {lead.service}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>Timeline</Label>
                      <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted }}>
                        {lead.timeline === "immediate"      ? "Immediate" :
                         lead.timeline === "within-30-days" ? "Within 30 Days" :
                         lead.timeline === "60-90-days"     ? "60–90 Days" :
                         lead.timeline === "3-6-months"     ? "3–6 Months" :
                         lead.timeline === "exploring"      ? "Exploring" :
                         lead.timeline}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>Status</Label>
                      <Badge status={lead.status} />
                    </div>
                  </div>

                  {lead.nextStep && (
                    <div style={{
                      padding: "0.5rem 0.75rem", marginBottom: "0.75rem",
                      background: C.goldFaint, border: `1px solid ${C.borderGold}`,
                    }}>
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.04em",
                        color: C.goldDim, lineHeight: 1.5,
                      }}>
                        → {lead.nextStep}
                      </p>
                    </div>
                  )}

                  <p style={{
                    fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.18)", textTransform: "uppercase" as const,
                  }}>
                    Received {fmtDateShort(lead.createdAt)}
                    {" · "}
                    {lead.type === "project-inquiry" ? "Project Application" : "Contact Form"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 6. Overdue Follow-ups ─────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Overdue Follow-ups"
            count={overdueFollowUps.length || undefined}
            href="/admin/collections/inquiries"
            linkText="Manage Inquiries →"
          />
          {overdueFollowUps.length === 0 ? (
            <div style={{
              background: C.bgElevated, border: `1px solid rgba(94,198,140,0.2)`,
              padding: "1.25rem 1.5rem",
              display: "flex", alignItems: "center", gap: "1rem",
            }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: C.green, flexShrink: 0,
              }} />
              <p style={{
                fontFamily: C.sans, fontSize: "0.6875rem", color: C.green,
                letterSpacing: "0.04em",
              }}>
                No overdue follow-ups. All lead follow-up dates are current.
              </p>
            </div>
          ) : (
            <Card>
              {overdueFollowUps.map((inq, i) => (
                <div
                  key={inq.id as number}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "0",
                    borderBottom: i < overdueFollowUps.length - 1
                      ? `1px solid rgba(255,255,255,0.04)` : "none",
                    borderLeft: `3px solid ${C.red}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, padding: "0.875rem 1.125rem" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontFamily: C.sans, fontSize: "0.8125rem",
                          color: C.cream, lineHeight: 1.3,
                          overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap" as const,
                        }}>
                          {(inq.company as string) || (inq.name as string) || "—"}
                        </p>
                        {(inq.name as string) &&
                         (inq.name as string) !== (inq.company as string) && (
                          <p style={{
                            fontFamily: C.sans, fontSize: "0.5rem",
                            color: "rgba(255,255,255,0.28)", marginTop: "0.2rem",
                          }}>
                            {inq.name as string}
                          </p>
                        )}
                      </div>
                      <Badge status={(inq.status as string) ?? "new"} />
                    </div>
                    {(inq.nextStep as string) && (
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.6875rem", color: C.goldDim,
                        marginTop: "0.375rem", lineHeight: 1.4, fontStyle: "italic",
                      }}>
                        → {inq.nextStep as string}
                      </p>
                    )}
                    <p style={{
                      fontFamily: C.sans, fontSize: "0.5rem",
                      color: C.red, marginTop: "0.375rem",
                      letterSpacing: "0.04em",
                    }}>
                      Follow-up due {fmtDate(inq.followUpDate as string)} · OVERDUE
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* ── 7 & 8. Service Demand + Revenue Forecast (2-col grid) ─────── */}
        <div
          className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:gap-10"
          style={{ marginBottom: "2.5rem" }}
        >
          {/* Service Demand Breakdown */}
          <section>
            <SectionHeader
              label="Service Demand Breakdown"
              href="/admin/collections/inquiries"
              linkText="View Inquiries →"
            />
            {svcRows.length === 0 ? (
              <EmptyState message="No inquiry data yet." />
            ) : (
              <Card>
                {svcRows.map((row, i) => (
                  <div
                    key={row.type}
                    style={{
                      padding: "0.9375rem 1.125rem",
                      borderBottom: i < svcRows.length - 1
                        ? `1px solid rgba(255,255,255,0.04)` : "none",
                    }}
                  >
                    <div
                      className="flex items-center justify-between gap-2"
                      style={{ marginBottom: "0.5rem" }}
                    >
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.6875rem",
                        color: C.cream, lineHeight: 1.3,
                      }}>
                        {row.label}
                      </p>
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.5rem",
                        color: C.goldDim, flexShrink: 0,
                        letterSpacing: "0.06em",
                      }}>
                        {row.count} {row.count === 1 ? "lead" : "leads"}
                      </p>
                    </div>
                    {/* Relative bar */}
                    <div style={{
                      width: "100%", height: "2px",
                      background: "rgba(255,255,255,0.06)",
                    }}>
                      <div style={{
                        width: `${Math.round((row.count / maxSvcCount) * 100)}%`,
                        height: "100%",
                        background: SERVICE_COLORS[row.type] ?? C.creamMuted,
                      }} />
                    </div>
                  </div>
                ))}
                <div style={{
                  padding: "0.625rem 1.125rem",
                  borderTop: `1px solid rgba(255,255,255,0.04)`,
                  background: "rgba(255,255,255,0.01)",
                }}>
                  <p style={{
                    fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.2)", textTransform: "uppercase" as const,
                  }}>
                    Source: contact form inquiries · {inquiries.length} total
                  </p>
                </div>
              </Card>
            )}
          </section>

          {/* Revenue Opportunity Forecast */}
          <section>
            <SectionHeader
              label="Revenue Opportunity Forecast"
              href="/admin/collections/inquiries"
              linkText="Pipeline →"
            />
            {forecastRows.length === 0 ? (
              <EmptyState message="No pipeline data for revenue forecasting." />
            ) : (
              <Card>
                {/* Column headers */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2.75rem 5.5rem 5.5rem",
                  gap: "0.5rem",
                  padding: "0.625rem 1.125rem",
                  borderBottom: `1px solid rgba(255,255,255,0.06)`,
                  background: "rgba(255,255,255,0.02)",
                }}>
                  {["Tier", "Leads", "Total Value", "Proj. (30%)"].map(h => (
                    <Label key={h} style={{ fontSize: "0.375rem" }}>{h}</Label>
                  ))}
                </div>
                {forecastRows.map((row, i) => (
                  <div
                    key={row.tier}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2.75rem 5.5rem 5.5rem",
                      gap: "0.5rem",
                      padding: "0.8125rem 1.125rem",
                      alignItems: "center",
                      borderBottom: i < forecastRows.length - 1
                        ? `1px solid rgba(255,255,255,0.04)` : "none",
                    }}
                  >
                    <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.cream }}>
                      {row.label}
                    </p>
                    <p style={{
                      fontFamily: C.sans, fontSize: "0.6875rem",
                      color: "rgba(255,255,255,0.45)",
                    }}>
                      {row.count}
                    </p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.gold }}>
                      {fmtMoney(row.totalValue)}
                    </p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.green }}>
                      {fmtMoney(row.projected)}
                    </p>
                  </div>
                ))}
                {/* Totals row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2.75rem 5.5rem 5.5rem",
                  gap: "0.5rem",
                  padding: "0.875rem 1.125rem",
                  borderTop: `1px solid rgba(255,255,255,0.08)`,
                  background: "rgba(255,255,255,0.02)",
                }}>
                  <p style={{
                    fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const,
                  }}>
                    Total
                  </p>
                  <p style={{
                    fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem",
                    color: C.cream,
                  }}>
                    {scoredLeads.length}
                  </p>
                  <p style={{
                    fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem",
                    color: C.gold,
                  }}>
                    {fmtMoney(pipelineValue)}
                  </p>
                  <p style={{
                    fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem",
                    color: C.green,
                  }}>
                    {fmtMoney(Math.round(pipelineValue * 0.3))}
                  </p>
                </div>
              </Card>
            )}
          </section>
        </div>

        {/* ── 9. SEO Content Coverage ───────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="SEO Content Coverage"
            count={seoGapCount > 0 ? seoGapCount : undefined}
            href="/admin/collections/insights"
            linkText={seoGapCount > 0 ? `${seoGapCount} Gap${seoGapCount !== 1 ? "s" : ""} →` : "Manage Insights →"}
          />
          <Card>
            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 3.5rem 5rem 5.5rem",
              gap: "0.75rem",
              padding: "0.625rem 1.25rem",
              borderBottom: `1px solid rgba(255,255,255,0.06)`,
              background: "rgba(255,255,255,0.02)",
            }}>
              {["Category", "Count", "Target", "Status"].map(h => (
                <Label key={h} style={{ fontSize: "0.375rem" }}>{h}</Label>
              ))}
            </div>
            {seoCoverageRows.map((row, i) => {
              const statusColor =
                row.status === "strong"   ? C.green  :
                row.status === "building" ? C.gold   :
                row.status === "minimal"  ? C.yellow :
                C.red;
              const statusLabel =
                row.status === "strong"   ? "Strong"   :
                row.status === "building" ? "Building" :
                row.status === "minimal"  ? "Minimal"  :
                "Gap";
              return (
                <div
                  key={row.value}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 3.5rem 5rem 5.5rem",
                    gap: "0.75rem",
                    padding: "0.8125rem 1.25rem",
                    alignItems: "center",
                    borderBottom: i < seoCoverageRows.length - 1
                      ? `1px solid rgba(255,255,255,0.04)` : "none",
                    borderLeft:
                      row.status === "gap"     ? `3px solid ${C.red}`    :
                      row.status === "minimal" ? `3px solid ${C.yellow}` :
                      `3px solid transparent`,
                  }}
                >
                  <p style={{
                    fontFamily: C.sans, fontSize: "0.6875rem", color: C.cream,
                  }}>
                    {row.label}
                  </p>
                  <p style={{
                    fontFamily: C.sans, fontSize: "0.6875rem",
                    color: row.count > 0 ? C.creamMuted : "rgba(255,255,255,0.2)",
                  }}>
                    {row.count}
                  </p>
                  <p style={{
                    fontFamily: C.sans, fontSize: "0.5rem",
                    color: "rgba(255,255,255,0.25)",
                  }}>
                    {row.target} needed
                  </p>
                  <span style={{
                    fontFamily: C.sans, fontWeight: 500,
                    fontSize: "0.375rem", letterSpacing: "0.14em",
                    textTransform: "uppercase" as const,
                    color: statusColor,
                    background: `${statusColor}18`,
                    border: `1px solid ${statusColor}50`,
                    padding: "0.2rem 0.65rem",
                    display: "inline-block",
                    whiteSpace: "nowrap" as const,
                  }}>
                    {statusLabel}
                  </span>
                </div>
              );
            })}
            {/* Summary footer */}
            <div style={{
              padding: "0.875rem 1.25rem",
              borderTop: `1px solid rgba(255,255,255,0.06)`,
              background: "rgba(255,255,255,0.02)",
              display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: "1rem", flexWrap: "wrap" as const,
            }}>
              <p style={{
                fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const,
              }}>
                {insights.length} published articles ·{" "}
                {seoCoverageRows.filter(r => r.status === "strong").length} strong ·{" "}
                {seoGapCount} needing content
              </p>
              <Link href="/admin/collections/insights" style={{
                fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.12em",
                textTransform: "uppercase" as const, color: C.gold,
                opacity: 0.6, textDecoration: "none",
              }}>
                Add Insight →
              </Link>
            </div>
          </Card>
        </section>

        {/* ── 10. Quick Actions ─────────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>Quick Actions</Label>
          </div>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
            style={{
              gap: "1px", background: C.border, border: `1px solid ${C.border}`,
            }}
          >
            {([
              { label: "All Inquiries",       sub: "Contact form leads",    href: "/admin/collections/inquiries" },
              { label: "Project Applications",sub: "Start-project intake",  href: "/admin/collections/project-inquiries" },
              { label: "Insights",            sub: "KXD Journal content",   href: "/admin/collections/insights" },
              { label: "Portfolio",           sub: "Case studies",          href: "/admin/collections/projects" },
              { label: "Retainers",           sub: "Revenue records",       href: "/admin/collections/retainers" },
              { label: "Services",            sub: "Service catalogue",     href: "/admin/collections/services" },
              { label: "Operations Hub",      sub: "Command center",        href: "/admin/operations" },
              { label: "Today",               sub: "Daily command center",  href: "/admin/operations/today" },
              { label: "Accounts",            sub: "Strategic intelligence", href: "/admin/operations/accounts" },
              { label: "Founder",             sub: "Command center",         href: "/admin/operations/founder" },
              { label: "Creative Engine",     sub: "Campaigns & assets",    href: "/admin/operations/creative" },
              { label: "Payload CMS",         sub: "Content & data",        href: "/admin" },
              { label: "Start Project",       sub: "Public intake form",    href: "/start-project" },
              { label: "View Website",        sub: "Live site",             href: "/" },
            ] as { label: string; sub: string; href: string }[]).map((action) => (
              <Link
                key={action.href}
                href={action.href}
                style={{
                  background: C.bgElevated, padding: "1.125rem 1.25rem",
                  display: "block", textDecoration: "none",
                }}
              >
                <p style={{
                  fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem",
                  color: C.creamMuted, letterSpacing: "0.02em", lineHeight: 1.3,
                }}>
                  {action.label}
                </p>
                <p style={{
                  fontFamily: C.sans, fontSize: "0.4375rem", letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.22)", marginTop: "0.3rem",
                  textTransform: "uppercase" as const,
                }}>
                  {action.sub}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{
          marginTop: "2.5rem", padding: "1rem 1.25rem",
          background: C.goldFaint, border: `1px solid ${C.borderGold}`,
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap" as const, gap: "0.5rem",
        }}>
          <p style={{
            fontFamily: C.sans, fontSize: "0.5625rem", letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.22)",
          }}>
            KXD OS · Growth Intelligence · Phase 2G · Live Payload data · Refreshes on each request
          </p>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" as const }}>
            {([
              ["/admin/operations",           "Operations"],
              ["/admin/operations/today",    "Today"],
              ["/admin/operations/creative", "Creative"],
              ["/admin/operations/accounts", "Accounts"],
              ["/admin/operations/founder",  "Founder"],
              ["/admin",                     "Payload"],
            ] as [string, string][]).map(([href, label]) => (
              <Link key={href} href={href} style={{
                fontFamily: C.sans, fontSize: "0.5rem", letterSpacing: "0.12em",
                textTransform: "uppercase" as const, color: C.gold,
                opacity: 0.45, textDecoration: "none",
              }}>
                {label} →
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
