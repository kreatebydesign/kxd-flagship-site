/**
 * KXD OS — Operations Suite
 * /admin/operations/command — Phase 2D
 *
 * Live Payload data: Clients, Retainers, ClientProjects,
 * MonthlyDeliverables, ClientRequests.
 *
 * New in Phase 2D:
 *   - Revenue Intelligence (MRR, tier breakdown, upcoming invoices, overdue)
 *   - Client Health Signals (overdue retainer, no deliverables, urgent request)
 *
 * Self-contained styling — hardcoded brand hex, standard Tailwind.
 * force-dynamic: fetches live data on every request.
 */
import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";

export const dynamic = "force-dynamic";

// ── Brand tokens ──────────────────────────────────────────────────────────────

const C = {
  bgPure:       "#050505",
  bgBase:       "#080808",
  bgElevated:   "#0B0B0B",
  bgCard:       "#101010",
  gold:         "#C9A962",
  goldDim:      "rgba(201,169,98,0.55)",
  goldFaint:    "rgba(255,255,255,0.035)",
  cream:        "#F5F1E8",
  creamMuted:   "rgba(245,241,232,0.72)",
  red:          "#d25a5a",
  redFaint:     "rgba(255,255,255,0.04)",
  yellow:       "#E8C468",
  yellowFaint:  "rgba(255,255,255,0.04)",
  green:        "#C9A962",
  greenFaint:   "rgba(255,255,255,0.035)",
  blue:         "#A8B4C8",
  teal:         "#A8B4C8",
  purple:       "#C4B0D8",
  border:       "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.11)",
  borderGold:   "rgba(201,169,98,0.16)",
  borderRed:    "rgba(210,90,90,0.25)",
  serif:        "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans:         "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

// ── Local types ───────────────────────────────────────────────────────────────

type ClientDoc = {
  id: number;
  name: string;
  slug?: string;
  status?: string;
  brandTier?: string;
  monthlyRetainerAmount?: number | null;
  billingDay?: number | null;
  nextBillingDate?: string | null;
  relationshipStatus?: string;
  nextAction?: string | null;
  nextActionDueDate?: string | null;
};

type RetainerDoc = {
  id: number;
  client?: number | ClientDoc | null;
  retainerName?: string;
  monthlyAmount?: number | null;
  billingCadence?: string;
  billingStatus?: string;
  billingDay?: number | null;
  autoRenew?: boolean;
  startDate?: string | null;
  renewalDate?: string | null;
  nextInvoiceDate?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  scopeSummary?: string | null;
};

type ProjectDoc = {
  id: number;
  client?: number | ClientDoc | null;
  projectName?: string;
  projectType?: string;
  status?: string;
  priority?: string;
  targetLaunchDate?: string | null;
  nextAction?: string | null;
  liveUrl?: string | null;
};

type DeliverableDoc = {
  id: number;
  client?: number | ClientDoc | null;
  relatedProject?: number | ProjectDoc | null;
  title?: string;
  month?: number | null;
  year?: number | null;
  category?: string;
  status?: string;
  dueDate?: string | null;
  owner?: string | null;
};

type RequestDoc = {
  id: number;
  client?: number | ClientDoc | null;
  relatedProject?: number | ProjectDoc | null;
  requestTitle?: string;
  requestType?: string;
  status?: string;
  priority?: string;
  requestedBy?: string | null;
  dueDate?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function clientId(c: number | ClientDoc | null | undefined): number | null {
  if (!c) return null;
  if (typeof c === "object") return c.id;
  return c;
}

function clientName(c: number | ClientDoc | null | undefined): string {
  if (!c) return "—";
  if (typeof c === "object") return c.name || "—";
  return `Client #${c}`;
}

function clientTier(c: number | ClientDoc | null | undefined): string {
  if (!c || typeof c !== "object") return "other";
  return c.brandTier ?? "other";
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  try { return new Date(iso) < new Date(); } catch { return false; }
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch { return null; }
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const TIER_LABELS: Record<string, string> = {
  flagship:    "Flagship",
  growth:      "Growth",
  maintenance: "Maintenance",
  internal:    "Internal",
  other:       "Other",
};

// ── Badge / priority config ───────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  healthy:            { label: "Healthy",          color: "#C9A962", bg: "rgba(255,255,255,0.035)",   border: "rgba(201,169,98,0.16)" },
  "needs-attention":  { label: "Needs Attention",  color: "#E8C468", bg: "rgba(255,255,255,0.04)",   border: "rgba(232,196,104,0.3)" },
  "at-risk":          { label: "At Risk",           color: "#d25a5a", bg: "rgba(255,255,255,0.04)",    border: "rgba(210,90,90,0.3)" },
  "not-started":      { label: "Not Started",       color: "#A8B4C8", bg: "rgba(255,255,255,0.035)",  border: "rgba(168,180,200,0.3)" },
  "in-progress":      { label: "In Progress",       color: "#E8C468", bg: "rgba(255,255,255,0.04)",   border: "rgba(232,196,104,0.3)" },
  "waiting-on-client":{ label: "Waiting",           color: "#C4B0D8", bg: "rgba(255,255,255,0.035)",  border: "rgba(196,176,216,0.3)" },
  complete:           { label: "Complete",          color: "#C9A962", bg: "rgba(255,255,255,0.035)",   border: "rgba(201,169,98,0.16)" },
  blocked:            { label: "Blocked",           color: "#d25a5a", bg: "rgba(255,255,255,0.04)",    border: "rgba(210,90,90,0.3)" },
  current:            { label: "Current",           color: "#C9A962", bg: "rgba(255,255,255,0.035)",   border: "rgba(201,169,98,0.16)" },
  active:             { label: "Active",            color: "#C9A962", bg: "rgba(255,255,255,0.035)",   border: "rgba(201,169,98,0.16)" },
  upcoming:           { label: "Upcoming",          color: "#A8B4C8", bg: "rgba(255,255,255,0.035)",  border: "rgba(168,180,200,0.3)" },
  paused:             { label: "Paused",            color: "#888880", bg: "rgba(136,136,128,0.08)",  border: "rgba(136,136,128,0.3)" },
  overdue:            { label: "Overdue",           color: "#d25a5a", bg: "rgba(255,255,255,0.04)",    border: "rgba(210,90,90,0.3)" },
  ended:              { label: "Ended",             color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
  planning:           { label: "Planning",          color: "#A8B4C8", bg: "rgba(255,255,255,0.035)",  border: "rgba(168,180,200,0.3)" },
  review:             { label: "Review",            color: "#C4B0D8", bg: "rgba(255,255,255,0.035)",  border: "rgba(196,176,216,0.3)" },
  new:                { label: "New",               color: "#C9A962", bg: "rgba(255,255,255,0.035)",   border: "rgba(201,169,98,0.16)" },
  triaged:            { label: "Triaged",           color: "#A8B4C8", bg: "rgba(255,255,255,0.035)",  border: "rgba(168,180,200,0.3)" },
  declined:           { label: "Declined",          color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
};

const PRIORITY_CFG: Record<string, { color: string; label: string }> = {
  urgent: { color: "#d25a5a", label: "Urgent" },
  high:   { color: "#E8C468", label: "High" },
  normal: { color: "rgba(255,255,255,0.25)", label: "Normal" },
  low:    { color: "rgba(255,255,255,0.12)", label: "Low" },
};

// ── Primitive components ──────────────────────────────────────────────────────

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: C.sans, fontWeight: 400,
      fontSize: "0.6875rem", letterSpacing: "0.14em",
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.3)", ...style,
    }}>
      {children}
    </p>
  );
}

function Badge({ status }: { status: string }) {
  const b = STATUS_BADGE[status] ?? { label: status, color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" };
  return (
    <span style={{
      fontFamily: C.sans, fontWeight: 500,
      fontSize: "0.6875rem", letterSpacing: "0.14em",
      textTransform: "uppercase" as const,
      color: b.color, background: b.bg, border: `1px solid ${b.border}`,
      padding: "0.2rem 0.65rem", whiteSpace: "nowrap" as const, display: "inline-block",
    }}>
      {b.label}
    </span>
  );
}

function PriorityBar({ priority }: { priority: string }) {
  const p = PRIORITY_CFG[priority] ?? PRIORITY_CFG.normal;
  return <div style={{ width: "2px", height: "2.25rem", background: p.color, flexShrink: 0, marginTop: "0.125rem" }} />;
}

function SectionHeader({ label, href, linkText }: { label: string; href?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
      <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>{label}</Label>
      {href && (
        <Link href={href} style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>
          {linkText ?? "View in CMS →"}
        </Link>
      )}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, ...style }}>{children}</div>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "2.25rem 1.5rem", textAlign: "center" as const }}>
      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.2)" }}>
        {message}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OperationsPage() {
  const now          = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();
  const in14Days     = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const today = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // ── Parallel fetches ──────────────────────────────────────────────────────────
  let allClients:       ClientDoc[]       = [];
  let allRetainers:     RetainerDoc[]     = [];
  let activeProjects:   ProjectDoc[]      = [];
  let monthDeliverables:DeliverableDoc[]  = [];
  let openRequests:     RequestDoc[]      = [];

  try {
    const payload = await getPayload({ config });

    const [clientsR, retainersR, projectsR, delivR, reqsR] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "clients" as any,              limit: 200, depth: 1, sort: "name" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "retainers" as any,            limit: 100, depth: 1 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "client-projects" as any,      limit: 100, depth: 1,
        where: { status: { in: ["planning","active","waiting-on-client","review"] } },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "monthly-deliverables" as any, limit: 100, depth: 1,
        where: { and: [{ month: { equals: currentMonth } }, { year: { equals: currentYear } }] },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "client-requests" as any,      limit: 100, depth: 1,
        where: { status: { in: ["new","triaged","in-progress","waiting-on-client"] } },
      }),
    ]);

    if (clientsR.status  === "fulfilled") allClients        = clientsR.value.docs        as ClientDoc[];
    if (retainersR.status=== "fulfilled") allRetainers      = retainersR.value.docs      as RetainerDoc[];
    if (projectsR.status === "fulfilled") activeProjects    = projectsR.value.docs       as ProjectDoc[];
    if (delivR.status    === "fulfilled") monthDeliverables = delivR.value.docs          as DeliverableDoc[];
    if (reqsR.status     === "fulfilled") openRequests      = reqsR.value.docs           as RequestDoc[];
  } catch {
    // Payload unavailable — all sections degrade to empty states.
  }

  // ── Derived sets ─────────────────────────────────────────────────────────────

  const activeClients    = allClients.filter(c => c.status === "active");
  const activeRetainers  = allRetainers.filter(r => r.billingStatus === "active" || r.billingStatus === "current");
  const overdueRetainers = allRetainers.filter(r => r.billingStatus === "overdue");

  const upcomingInvoices = allRetainers
    .filter(r => {
      if (!r.nextInvoiceDate) return false;
      const d = new Date(r.nextInvoiceDate);
      return d >= now && d <= in14Days;
    })
    .sort((a, b) => new Date(a.nextInvoiceDate!).getTime() - new Date(b.nextInvoiceDate!).getTime());

  const totalMRR = activeRetainers.reduce((s, r) => s + (r.monthlyAmount ?? 0), 0);

  // ── Revenue by client tier ────────────────────────────────────────────────────
  const tierRevenue: Record<string, number> = {};
  for (const r of activeRetainers) {
    const tier = clientTier(r.client);
    tierRevenue[tier] = (tierRevenue[tier] ?? 0) + (r.monthlyAmount ?? 0);
  }
  const tierRevenueEntries = Object.entries(tierRevenue).sort((a, b) => b[1] - a[1]);

  // ── Client health signals ─────────────────────────────────────────────────────
  const healthIssues = new Map<number, string[]>();
  function addIssue(cid: number, msg: string) {
    const arr = healthIssues.get(cid) ?? [];
    if (!arr.includes(msg)) arr.push(msg);
    healthIssues.set(cid, arr);
  }

  // Signal 1: overdue retainer
  for (const r of overdueRetainers) {
    const cid = clientId(r.client);
    if (cid) addIssue(cid, "Retainer overdue");
  }

  // Signal 2: active retainer client with no deliverables this month
  const clientsWithDeliv = new Set(
    monthDeliverables.map(d => clientId(d.client)).filter(Boolean)
  );
  const clientsWithActiveRetainer = new Set(
    activeRetainers.map(r => clientId(r.client)).filter(Boolean)
  );
  for (const cid of clientsWithActiveRetainer) {
    if (cid && !clientsWithDeliv.has(cid)) {
      addIssue(cid, "No deliverables logged this month");
    }
  }

  // Signal 3: open urgent request
  const PRIO_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedRequests = [...openRequests].sort(
    (a, b) => (PRIO_ORDER[a.priority ?? "normal"] ?? 2) - (PRIO_ORDER[b.priority ?? "normal"] ?? 2)
  );
  for (const req of openRequests.filter(r => r.priority === "urgent")) {
    const cid = clientId(req.client);
    if (cid) addIssue(cid, "Urgent request open");
  }

  const flaggedClients = activeClients
    .filter(c => healthIssues.has(c.id))
    .map(c => ({ ...c, issues: healthIssues.get(c.id) ?? [] }));

  // ── Clients requiring relationship action ─────────────────────────────────────
  const atRiskClients = allClients.filter(
    c => c.relationshipStatus === "at-risk" || c.relationshipStatus === "needs-attention"
  );
  const pastDueActionClients = allClients.filter(
    c => c.nextActionDueDate && isPast(c.nextActionDueDate)
  );
  const clientsNeedingAction = Array.from(
    new Map([...atRiskClients, ...pastDueActionClients].map(c => [c.id, c])).values()
  );

  const openDeliverables = monthDeliverables.filter(d => d.status !== "complete");

  // ── KPI array ─────────────────────────────────────────────────────────────────
  const KPI = [
    {
      label: "Active Clients",
      value: String(activeClients.length),
      sub: "Currently engaged",
      delta: `${allClients.length} total on record`,
      alert: false,
    },
    {
      label: "Active Retainers",
      value: String(activeRetainers.length),
      sub: "Recurring billing",
      delta: overdueRetainers.length > 0
        ? `${overdueRetainers.length} overdue`
        : upcomingInvoices.length > 0
          ? `${upcomingInvoices.length} invoices due soon`
          : "All current",
      alert: overdueRetainers.length > 0,
    },
    {
      label: "Monthly Revenue",
      value: totalMRR > 0 ? fmtMoney(totalMRR) : "$0",
      sub: "MRR — retainer base",
      delta: activeRetainers.length > 0
        ? `${activeRetainers.length} retainer${activeRetainers.length !== 1 ? "s" : ""}`
        : "No retainers yet",
      alert: false,
    },
    {
      label: "Health Signals",
      value: String(flaggedClients.length),
      sub: "Clients flagged",
      delta: flaggedClients.length === 0
        ? "All clear"
        : `${overdueRetainers.length} overdue · ${openRequests.filter(r => r.priority === "urgent").length} urgent`,
      alert: flaggedClients.length > 0,
    },
    {
      label: "Open Requests",
      value: String(openRequests.length),
      sub: "Triaged + active",
      delta: sortedRequests.filter(r => r.priority === "urgent" || r.priority === "high").length > 0
        ? `${sortedRequests.filter(r => r.priority === "urgent" || r.priority === "high").length} high priority`
        : "No urgent items",
      alert: openRequests.some(r => r.priority === "urgent"),
    },
    {
      label: "Deliverables This Month",
      value: `${openDeliverables.length}/${monthDeliverables.length}`,
      sub: `${MONTH_NAMES[currentMonth - 1]} ${currentYear} open / total`,
      delta: monthDeliverables.filter(d => d.status === "blocked").length > 0
        ? `${monthDeliverables.filter(d => d.status === "blocked").length} blocked`
        : monthDeliverables.length === 0 ? "None logged yet" : "No blockers",
      alert: monthDeliverables.some(d => d.status === "blocked"),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans, WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}>

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bgPure, borderBottom: `1px solid ${C.gold}40` }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <KxdLogo />
              <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.6875rem" }}>◆</span>
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted, lineHeight: 1 }}>
                  Operations
                </p>
                <p className="hidden sm:block" style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginTop: "0.35rem" }}>
                  Operations Suite
                </p>
              </div>
              <span style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,169,98,0.75)", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(201,169,98,0.2)", padding: "0.2rem 0.6rem" }}>
                Phase 2D
              </span>
            </div>
            <div className="flex items-center gap-5">
              <p className="hidden sm:block" style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.22)" }}>
                {today}
              </p>
              <Link href="/admin/operations/executive" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, opacity: 0.8, textDecoration: "none" }}>
                Executive →
              </Link>
              <Link href="/admin/operations/today" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.teal, opacity: 0.8, textDecoration: "none" }}>
                Today →
              </Link>
              <Link href="/admin/operations/growth" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, opacity: 0.8, textDecoration: "none" }}>
                Growth →
              </Link>
              <Link href="/admin/operations/accounts" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.purple, opacity: 0.8, textDecoration: "none" }}>
                Accounts →
              </Link>
              <Link href="/admin/operations/founder" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, opacity: 0.8, textDecoration: "none" }}>
                Founder →
              </Link>
              <Link href="/admin" style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, opacity: 0.55, textDecoration: "none" }}>
                Payload CMS →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Page body ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>

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
              <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em", marginTop: "0.375rem" }}>
                {kpi.sub}
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: kpi.alert ? C.red : C.goldDim, letterSpacing: "0.06em", marginTop: "0.5rem" }}>
                {kpi.delta}
              </p>
            </div>
          ))}
        </div>

        {/* ── 2. Client Health Signals ──────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader label="Client Health Signals" href="/admin/collections/clients" linkText="Manage Clients →" />

          {flaggedClients.length === 0 ? (
            <div style={{ background: C.bgElevated, border: `1px solid rgba(201,169,98,0.2)`, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.gold, flexShrink: 0 }} />
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.gold, letterSpacing: "0.04em" }}>
                All client health signals clear — no flags detected.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-3" style={{ background: C.border }}>
              {flaggedClients.map((client) => {
                const hasOverdue = client.issues.includes("Retainer overdue");
                const hasUrgent  = client.issues.includes("Urgent request open");
                const borderColor = hasOverdue || hasUrgent ? C.borderRed : C.borderGold;
                return (
                  <div key={client.id} style={{ background: C.bgElevated, padding: "1rem 1.25rem", borderLeft: `3px solid ${hasOverdue || hasUrgent ? C.red : C.yellow}` }}>
                    <div className="flex items-start justify-between gap-2" style={{ marginBottom: "0.5rem" }}>
                      <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.875rem", color: C.cream, borderLeft: "none" }}>
                        {client.name}
                      </p>
                      {client.brandTier && (
                        <Label style={{ color: C.goldDim, letterSpacing: "0.1em", flexShrink: 0 }}>
                          {TIER_LABELS[client.brandTier] ?? client.brandTier}
                        </Label>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      {client.issues.map((issue) => (
                        <p key={issue} style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: issue.includes("overdue") || issue.includes("Urgent") ? C.red : C.yellow, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ fontSize: "0.8125rem" }}>▸</span>
                          {issue}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 3. Revenue Intelligence + Clients Requiring Action ────────── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem] xl:gap-10" style={{ marginBottom: "2.5rem" }}>

          {/* ── Revenue Intelligence ────────────────────────────────────── */}
          <section>
            <SectionHeader label="Revenue Intelligence" href="/admin/collections/retainers" linkText="Manage Retainers →" />

            {/* MRR + Tier breakdown */}
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, marginBottom: "1px" }}>
              {/* MRR header */}
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <Label>Monthly Recurring Revenue</Label>
                  <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "2rem", lineHeight: 1, color: totalMRR > 0 ? C.gold : C.creamMuted, marginTop: "0.5rem", letterSpacing: "-0.01em" }}>
                    {totalMRR > 0 ? fmtMoney(totalMRR) : "—"}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                  {overdueRetainers.length > 0 && <Badge status="overdue" />}
                  {upcomingInvoices.length > 0 && (
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.08em", color: C.teal }}>
                      {upcomingInvoices.length} invoice{upcomingInvoices.length !== 1 ? "s" : ""} due within 14d
                    </p>
                  )}
                </div>
              </div>

              {/* Revenue by tier */}
              {tierRevenueEntries.length > 0 && (
                <div style={{ padding: "0.75rem 1.5rem" }}>
                  <Label style={{ marginBottom: "0.625rem", display: "block" }}>Revenue by Client Tier</Label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {tierRevenueEntries.map(([tier, amount]) => {
                      const pct = totalMRR > 0 ? Math.round((amount / totalMRR) * 100) : 0;
                      return (
                        <div key={tier} style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                          <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.creamMuted, width: "6rem", flexShrink: 0 }}>
                            {TIER_LABELS[tier] ?? tier}
                          </p>
                          <div style={{ flex: 1, height: "2px", background: "rgba(255,255,255,0.06)", position: "relative" as const }}>
                            <div style={{ position: "absolute" as const, left: 0, top: 0, height: "100%", width: `${pct}%`, background: tier === "flagship" ? C.gold : C.blue, transition: "width 0.3s" }} />
                          </div>
                          <p style={{ fontFamily: C.sans, fontWeight: 300, fontSize: "0.75rem", color: C.cream, width: "4.5rem", textAlign: "right" as const, flexShrink: 0 }}>
                            {fmtMoney(amount)}
                          </p>
                          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.25)", width: "2.5rem", textAlign: "right" as const, flexShrink: 0 }}>
                            {pct}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming invoices (next 14 days) */}
            {upcomingInvoices.length > 0 && (
              <>
                <div style={{ marginTop: "1rem", marginBottom: "0.625rem" }}>
                  <Label style={{ color: C.teal }}>Upcoming Invoices — Next 14 Days</Label>
                </div>
                <Card>
                  {upcomingInvoices.map((r, i) => {
                    const days = daysUntil(r.nextInvoiceDate);
                    return (
                      <div key={r.id} style={{ padding: "0.8125rem 1.25rem", borderBottom: i < upcomingInvoices.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {clientName(r.client)}
                          </p>
                          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.2rem" }}>
                            {r.retainerName ?? "Retainer"} · {fmtDateShort(r.nextInvoiceDate)}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                          {days !== null && (
                            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.06em", color: days <= 3 ? C.red : C.teal }}>
                              {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                            </p>
                          )}
                          <p style={{ fontFamily: C.sans, fontWeight: 300, fontSize: "0.875rem", color: C.cream }}>
                            {r.monthlyAmount ? fmtMoney(r.monthlyAmount) : "—"}
                          </p>
                          <Badge status={r.billingStatus ?? "active"} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </>
            )}

            {/* Overdue retainers alert */}
            {overdueRetainers.length > 0 && (
              <>
                <div style={{ marginTop: "1rem", marginBottom: "0.625rem" }}>
                  <Label style={{ color: C.red }}>Overdue Retainers</Label>
                </div>
                <div style={{ background: C.bgElevated, border: `1px solid ${C.borderRed}` }}>
                  {overdueRetainers.map((r, i) => (
                    <div key={r.id} style={{ padding: "0.8125rem 1.25rem", borderBottom: i < overdueRetainers.length - 1 ? `1px solid rgba(210,90,90,0.1)` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {clientName(r.client)}
                        </p>
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.2rem" }}>
                          {r.retainerName ?? "Retainer"}{r.nextInvoiceDate ? ` · Was due ${fmtDateShort(r.nextInvoiceDate)}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                        <p style={{ fontFamily: C.sans, fontWeight: 300, fontSize: "0.875rem", color: C.red }}>{r.monthlyAmount ? fmtMoney(r.monthlyAmount) : "—"}</p>
                        <Badge status="overdue" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {allRetainers.length === 0 && <EmptyState message="No retainers configured yet." />}
          </section>

          {/* ── Clients Requiring Action ────────────────────────────────── */}
          <section>
            <SectionHeader label="Clients Requiring Action" href="/admin/collections/clients" linkText="Manage Clients →" />
            {clientsNeedingAction.length === 0 ? (
              <EmptyState message="No clients flagged — all relationships healthy." />
            ) : (
              <Card>
                {clientsNeedingAction.map((client, i) => (
                  <div key={client.id} style={{ padding: "1rem 1.25rem", borderBottom: i < clientsNeedingAction.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <div style={{ width: "3px", minHeight: "2.5rem", background: client.relationshipStatus === "at-risk" ? C.red : C.yellow, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-start justify-between gap-2">
                        <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.875rem", color: C.cream }}>
                          {client.name}
                        </p>
                        <Badge status={client.relationshipStatus ?? "healthy"} />
                      </div>
                      {client.nextAction && (
                        <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: "0.3rem", lineHeight: 1.4 }}>
                          {client.nextAction}
                        </p>
                      )}
                      {client.nextActionDueDate && (
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.06em", color: isPast(client.nextActionDueDate) ? C.red : "rgba(255,255,255,0.28)", marginTop: "0.35rem", textTransform: "uppercase" }}>
                          Due {fmtDate(client.nextActionDueDate)}
                          {isPast(client.nextActionDueDate) ? " · OVERDUE" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>

        {/* ── 4. This Month's Deliverables ──────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label={`${MONTH_NAMES[currentMonth - 1]} ${currentYear} — Deliverables`}
            href="/admin/collections/monthly-deliverables"
            linkText="Manage Deliverables →"
          />

          {monthDeliverables.length === 0 ? (
            <EmptyState message={`No deliverables logged for ${MONTH_NAMES[currentMonth - 1]} ${currentYear} yet.`} />
          ) : (
            <Card style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,1fr) 130px 100px 90px 90px 90px", padding: "0.6875rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.06)`, background: "rgba(255,255,255,0.02)", minWidth: "700px" }}>
                {["Deliverable","Client","Category","Status","Due","Owner"].map(h => <Label key={h}>{h}</Label>)}
              </div>
              {monthDeliverables.map((d, i) => (
                <div key={d.id} style={{ display: "grid", gridTemplateColumns: "minmax(200px,1fr) 130px 100px 90px 90px 90px", padding: "0.875rem 1.25rem", borderBottom: i < monthDeliverables.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none", alignItems: "center", minWidth: "700px" }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, lineHeight: 1.3, paddingRight: "0.75rem" }}>{d.title ?? "—"}</p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.creamMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientName(d.client)}</p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.04em", color: "rgba(255,255,255,0.35)", textTransform: "capitalize" as const }}>{d.category ?? "—"}</p>
                  <div><Badge status={d.status ?? "not-started"} /></div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: d.dueDate && isPast(d.dueDate) && d.status !== "complete" ? C.red : "rgba(255,255,255,0.35)" }}>{fmtDate(d.dueDate)}</p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: "rgba(255,255,255,0.35)" }}>{d.owner ?? "—"}</p>
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* ── 5. Open Requests + Active Projects ────────────────────────── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:gap-10">
          {/* Open Requests */}
          <section>
            <SectionHeader label="Open Client Requests" href="/admin/collections/client-requests" linkText="Manage Requests →" />
            {sortedRequests.length === 0 ? (
              <EmptyState message="No open requests — inbox clear." />
            ) : (
              <Card>
                {sortedRequests.map((req, i) => (
                  <div key={req.id} style={{ padding: "0.875rem 1.125rem", borderBottom: i < sortedRequests.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none", display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                    <PriorityBar priority={req.priority ?? "normal"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-start justify-between gap-2">
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, lineHeight: 1.3, flex: 1 }}>
                          {req.requestTitle ?? "—"}
                        </p>
                        <Badge status={req.status ?? "new"} />
                      </div>
                      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)", marginTop: "0.25rem" }}>
                        {clientName(req.client)}{req.requestType ? ` · ${req.requestType}` : ""}{req.dueDate ? ` · Due ${fmtDate(req.dueDate)}` : ""}{req.priority === "urgent" ? " · URGENT" : req.priority === "high" ? " · HIGH" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>

          {/* Active Projects */}
          <section>
            <SectionHeader label="Active Projects" href="/admin/collections/client-projects" linkText="Manage Projects →" />
            {activeProjects.length === 0 ? (
              <EmptyState message="No active projects in delivery." />
            ) : (
              <Card>
                {activeProjects.map((proj, i) => (
                  <div key={proj.id} style={{ padding: "0.875rem 1.125rem", borderBottom: i < activeProjects.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none", display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                    <PriorityBar priority={proj.priority ?? "normal"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-start justify-between gap-2">
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, lineHeight: 1.3, flex: 1 }}>
                          {proj.projectName ?? "—"}
                        </p>
                        <Badge status={proj.status ?? "planning"} />
                      </div>
                      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)", marginTop: "0.25rem" }}>
                        {clientName(proj.client)}{proj.projectType ? ` · ${proj.projectType}` : ""}{proj.targetLaunchDate ? ` · Launch ${fmtDate(proj.targetLaunchDate)}` : ""}
                      </p>
                      {proj.nextAction && (
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.goldDim, marginTop: "0.3rem", lineHeight: 1.3, fontStyle: "italic" }}>
                          → {proj.nextAction}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{ marginTop: "2.5rem", padding: "1rem 1.25rem", background: C.goldFaint, border: `1px solid ${C.borderGold}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: "0.5rem" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.22)" }}>
            KXD OS · Operations Suite · Phase 2D · Live Payload data
          </p>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" as const }}>
            {([
              ["/admin/operations/executive",              "Executive"],
              ["/admin/operations/playbooks",                "Playbooks"],
              ["/admin/operations/today",                  "Today"],
              ["/admin/operations/growth",                 "Growth"],
              ["/admin/operations/accounts",               "Accounts"],
              ["/admin/operations/founder",                "Founder"],
              ["/admin/collections/clients",               "Clients"],
              ["/admin/collections/retainers",             "Retainers"],
              ["/admin/collections/client-projects",       "Projects"],
              ["/admin/collections/client-requests",       "Requests"],
            ] as [string, string][]).map(([href, label]) => (
              <Link key={href} href={href} style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.gold, opacity: 0.45, textDecoration: "none" }}>
                {label} →
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
