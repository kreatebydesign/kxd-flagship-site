/**
 * KXD OS — Operations Command Center
 * /admin/operations — Phase 2C
 *
 * Live data from Payload KXD OS collections (Clients, Retainers,
 * ClientProjects, MonthlyDeliverables, ClientRequests).
 * Self-contained styling — hardcoded brand hex, standard Tailwind.
 * server component, force-dynamic (no caching).
 */
import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";

export const dynamic = "force-dynamic";

// ── Brand constants ───────────────────────────────────────────────────────────

const C = {
  bgPure:       "#000000",
  bgBase:       "#080808",
  bgElevated:   "#111111",
  bgCard:       "#141414",
  gold:         "#C5A65C",
  goldDim:      "rgba(197,166,92,0.55)",
  goldFaint:    "rgba(197,166,92,0.08)",
  cream:        "#f8f3ea",
  creamMuted:   "#bfb7aa",
  creamSoft:    "#e8ded0",
  red:          "#d25a5a",
  yellow:       "#f0be50",
  green:        "#5ec68c",
  blue:         "#8a9bd2",
  teal:         "#96d2c8",
  purple:       "#b48cdc",
  border:       "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.11)",
  borderGold:   "rgba(197,166,92,0.22)",
  serif:        "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans:         "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

// ── Local types (not relying on stale payload-types) ─────────────────────────

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
  renewalDate?: string | null;
  nextInvoiceDate?: string | null;
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

function clientName(c: number | ClientDoc | null | undefined): string {
  if (!c) return "—";
  if (typeof c === "object") return c.name || "—";
  return `Client #${c}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Status / badge config ─────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  // relationship health
  healthy:          { label: "Healthy",          color: "#5ec68c", bg: "rgba(94,198,140,0.08)",    border: "rgba(94,198,140,0.3)" },
  "needs-attention":{ label: "Needs Attention",  color: "#f0be50", bg: "rgba(240,190,80,0.08)",    border: "rgba(240,190,80,0.3)" },
  "at-risk":        { label: "At Risk",           color: "#d25a5a", bg: "rgba(210,90,90,0.08)",     border: "rgba(210,90,90,0.3)" },
  // deliverable / request status
  "not-started":    { label: "Not Started",       color: "#8a9bd2", bg: "rgba(138,155,210,0.08)",   border: "rgba(138,155,210,0.3)" },
  "in-progress":    { label: "In Progress",       color: "#f0be50", bg: "rgba(240,190,80,0.08)",    border: "rgba(240,190,80,0.3)" },
  "waiting-on-client":{ label:"Waiting",          color: "#b48cdc", bg: "rgba(180,140,220,0.08)",   border: "rgba(180,140,220,0.3)" },
  complete:         { label: "Complete",          color: "#5ec68c", bg: "rgba(94,198,140,0.08)",    border: "rgba(94,198,140,0.3)" },
  blocked:          { label: "Blocked",           color: "#d25a5a", bg: "rgba(210,90,90,0.08)",     border: "rgba(210,90,90,0.3)" },
  // billing
  active:           { label: "Active",            color: "#5ec68c", bg: "rgba(94,198,140,0.08)",    border: "rgba(94,198,140,0.3)" },
  paused:           { label: "Paused",            color: "#888880", bg: "rgba(136,136,128,0.08)",   border: "rgba(136,136,128,0.3)" },
  overdue:          { label: "Overdue",           color: "#d25a5a", bg: "rgba(210,90,90,0.08)",     border: "rgba(210,90,90,0.3)" },
  ended:            { label: "Ended",             color: "rgba(255,255,255,0.3)", bg:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.1)" },
  // project
  planning:         { label: "Planning",          color: "#96d2c8", bg: "rgba(150,210,200,0.08)",   border: "rgba(150,210,200,0.3)" },
  review:           { label: "Review",            color: "#b48cdc", bg: "rgba(180,140,220,0.08)",   border: "rgba(180,140,220,0.3)" },
  // requests
  new:              { label: "New",               color: "#C5A65C", bg: "rgba(197,166,92,0.08)",    border: "rgba(197,166,92,0.3)" },
  triaged:          { label: "Triaged",           color: "#96d2c8", bg: "rgba(150,210,200,0.08)",   border: "rgba(150,210,200,0.3)" },
  declined:         { label: "Declined",          color: "rgba(255,255,255,0.3)", bg:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.1)" },
};

const PRIORITY_CFG: Record<string, { color: string; label: string }> = {
  urgent: { color: "#d25a5a", label: "Urgent" },
  high:   { color: "#f0be50", label: "High" },
  normal: { color: "rgba(255,255,255,0.25)", label: "Normal" },
  low:    { color: "rgba(255,255,255,0.12)", label: "Low" },
};

// ── Reusable primitives ───────────────────────────────────────────────────────

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: C.sans,
      fontWeight: 400,
      fontSize: "0.4375rem",
      letterSpacing: "0.14em",
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.3)",
      ...style,
    }}>
      {children}
    </p>
  );
}

function Badge({ status }: { status: string }) {
  const b = STATUS_BADGE[status] ?? {
    label: status,
    color: "rgba(255,255,255,0.3)",
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)",
  };
  return (
    <span style={{
      fontFamily: C.sans,
      fontWeight: 500,
      fontSize: "0.375rem",
      letterSpacing: "0.14em",
      textTransform: "uppercase" as const,
      color: b.color,
      background: b.bg,
      border: `1px solid ${b.border}`,
      padding: "0.2rem 0.65rem",
      whiteSpace: "nowrap" as const,
      display: "inline-block",
    }}>
      {b.label}
    </span>
  );
}

function PriorityBar({ priority }: { priority: string }) {
  const p = PRIORITY_CFG[priority] ?? PRIORITY_CFG.normal;
  return (
    <div style={{
      width: "2px",
      height: "2.25rem",
      background: p.color,
      flexShrink: 0,
      marginTop: "0.125rem",
    }} />
  );
}

function SectionHeader({
  label, href, linkText,
}: {
  label: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
      <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>{label}</Label>
      {href && (
        <Link href={href} style={{
          fontFamily: C.sans,
          fontSize: "0.5rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: "rgba(255,255,255,0.22)",
          textDecoration: "none",
        }}>
          {linkText ?? "View in CMS →"}
        </Link>
      )}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.bgElevated,
      border: `1px solid ${C.border}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      background: C.bgElevated,
      border: `1px solid ${C.border}`,
      padding: "2.5rem 1.5rem",
      textAlign: "center" as const,
    }}>
      <p style={{
        fontFamily: C.sans,
        fontSize: "0.5625rem",
        letterSpacing: "0.08em",
        color: "rgba(255,255,255,0.2)",
      }}>
        {message}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OperationsPage() {
  const now  = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // ── Fetch all collections in parallel, fail gracefully ──────────────────────
  let allClients:       ClientDoc[]      = [];
  let allRetainers:     RetainerDoc[]    = [];
  let activeProjects:   ProjectDoc[]     = [];
  let monthDeliverables:DeliverableDoc[] = [];
  let openRequests:     RequestDoc[]     = [];

  try {
    const payload = await getPayload({ config });

    const [
      clientsRes,
      retainersRes,
      projectsRes,
      deliverablesRes,
      requestsRes,
    ] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "clients" as any, limit: 200, depth: 1, sort: "name" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "retainers" as any, limit: 100, depth: 1 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "client-projects" as any, limit: 100, depth: 1,
        where: { status: { in: ["planning","active","waiting-on-client","review"] } },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "monthly-deliverables" as any, limit: 100, depth: 1,
        where: { and: [
          { month: { equals: currentMonth } },
          { year:  { equals: currentYear  } },
        ]},
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "client-requests" as any, limit: 100, depth: 1,
        where: { status: { in: ["new","triaged","in-progress","waiting-on-client"] } },
      }),
    ]);

    if (clientsRes.status      === "fulfilled") allClients        = clientsRes.value.docs       as ClientDoc[];
    if (retainersRes.status    === "fulfilled") allRetainers      = retainersRes.value.docs     as RetainerDoc[];
    if (projectsRes.status     === "fulfilled") activeProjects    = projectsRes.value.docs      as ProjectDoc[];
    if (deliverablesRes.status === "fulfilled") monthDeliverables = deliverablesRes.value.docs  as DeliverableDoc[];
    if (requestsRes.status     === "fulfilled") openRequests      = requestsRes.value.docs      as RequestDoc[];
  } catch {
    // Payload unavailable — all sections show empty states
  }

  // ── Derived KPIs ─────────────────────────────────────────────────────────────

  const activeClients     = allClients.filter(c => c.status === "active");
  const activeRetainers   = allRetainers.filter(r => r.billingStatus === "active");
  const overdueRetainers  = allRetainers.filter(r => r.billingStatus === "overdue");
  const atRiskClients     = allClients.filter(c =>
    c.relationshipStatus === "at-risk" || c.relationshipStatus === "needs-attention"
  );
  const openDeliverables  = monthDeliverables.filter(
    d => d.status !== "complete" && d.status !== "blocked"
  );

  const totalMRR = activeRetainers.reduce((sum, r) => sum + (r.monthlyAmount ?? 0), 0);

  const clientsNeedingAction = Array.from(
    new Map(
      [
        ...allClients.filter(c =>
          c.relationshipStatus === "at-risk" || c.relationshipStatus === "needs-attention"
        ),
        ...allClients.filter(c =>
          c.nextActionDueDate && isPast(c.nextActionDueDate)
        ),
      ].map(c => [c.id, c])
    ).values()
  );

  // ── Sorted open requests by priority ─────────────────────────────────────────
  const PRIO_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedRequests = [...openRequests].sort(
    (a, b) => (PRIO_ORDER[a.priority ?? "normal"] ?? 2) - (PRIO_ORDER[b.priority ?? "normal"] ?? 2)
  );

  const KPI = [
    {
      label: "Active Clients",
      value: String(activeClients.length),
      sub: "Currently engaged",
      delta: `${allClients.length} total on record`,
      highlight: false,
    },
    {
      label: "Active Retainers",
      value: String(activeRetainers.length),
      sub: "Recurring billing",
      delta: overdueRetainers.length > 0 ? `${overdueRetainers.length} overdue` : "All current",
      highlight: overdueRetainers.length > 0,
    },
    {
      label: "Open Requests",
      value: String(openRequests.length),
      sub: "Triaged + active",
      delta: sortedRequests.filter(r => r.priority === "urgent" || r.priority === "high").length > 0
        ? `${sortedRequests.filter(r => r.priority === "urgent" || r.priority === "high").length} high priority`
        : "No urgent items",
      highlight: sortedRequests.some(r => r.priority === "urgent"),
    },
    {
      label: "Deliverables This Month",
      value: `${openDeliverables.length}/${monthDeliverables.length}`,
      sub: `${MONTH_NAMES[currentMonth - 1]} ${currentYear} open / total`,
      delta: monthDeliverables.filter(d => d.status === "blocked").length > 0
        ? `${monthDeliverables.filter(d => d.status === "blocked").length} blocked`
        : "No blockers",
      highlight: monthDeliverables.some(d => d.status === "blocked"),
    },
    {
      label: "Needs Attention",
      value: String(atRiskClients.length),
      sub: "Relationship health",
      delta: atRiskClients.some(c => c.relationshipStatus === "at-risk") ? "At-risk flagged" : "Monitor closely",
      highlight: atRiskClients.some(c => c.relationshipStatus === "at-risk"),
    },
    {
      label: "Monthly Revenue",
      value: totalMRR > 0 ? fmtMoney(totalMRR) : "$0",
      sub: "MRR — retainer base",
      delta: activeRetainers.length > 0 ? `${activeRetainers.length} active retainer${activeRetainers.length === 1 ? "" : "s"}` : "No retainers yet",
      highlight: false,
    },
  ];

  // ── Page render ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      background: C.bgBase,
      minHeight: "100vh",
      color: C.cream,
      fontFamily: C.sans,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    }}>

      {/* ── Sticky Header ──────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: C.bgPure,
        borderBottom: `1px solid ${C.gold}40`,
      }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" aria-label="Kreate by Design Home" className="flex items-center" style={{ textDecoration: "none" }}>
                <KxdLogo />
              </Link>

              <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.375rem" }}>◆</span>

              <div>
                <p style={{
                  fontFamily: C.sans,
                  fontWeight: 500,
                  fontSize: "0.5625rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: C.creamMuted,
                  lineHeight: 1,
                }}>
                  Operations
                </p>
                <p className="hidden sm:block" style={{
                  fontFamily: C.sans,
                  fontSize: "0.5rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.24)",
                  marginTop: "0.35rem",
                }}>
                  Executive Command Center
                </p>
              </div>

              <span style={{
                fontFamily: C.sans,
                fontWeight: 500,
                fontSize: "0.375rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(94,198,140,0.75)",
                background: "rgba(94,198,140,0.07)",
                border: "1px solid rgba(94,198,140,0.2)",
                padding: "0.2rem 0.6rem",
              }}>
                Phase 2
              </span>
            </div>

            <div className="flex items-center gap-5">
              <p className="hidden sm:block" style={{
                fontFamily: C.sans,
                fontSize: "0.5625rem",
                letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.22)",
              }}>
                {today}
              </p>
              <Link href="/admin" style={{
                fontFamily: C.sans,
                fontWeight: 500,
                fontSize: "0.5rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: C.gold,
                opacity: 0.55,
                textDecoration: "none",
              }}>
                Payload CMS →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>

        {/* ── 1. Executive Summary KPIs ──────────────────────────────────── */}
        <div style={{ marginBottom: "1.125rem" }}>
          <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>Executive Summary</Label>
        </div>

        <div
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
          style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}`, marginBottom: "2.5rem" }}
        >
          {KPI.map((kpi) => (
            <div key={kpi.label} style={{ background: C.bgElevated, padding: "1.375rem 1.5rem" }}>
              <Label>{kpi.label}</Label>
              <p style={{
                fontFamily: C.serif,
                fontWeight: 300,
                fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                lineHeight: 1,
                color: kpi.highlight ? C.yellow : C.cream,
                marginTop: "0.625rem",
                letterSpacing: "-0.01em",
              }}>
                {kpi.value}
              </p>
              <p style={{
                fontFamily: C.sans,
                fontSize: "0.5625rem",
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.04em",
                marginTop: "0.375rem",
              }}>
                {kpi.sub}
              </p>
              <p style={{
                fontFamily: C.sans,
                fontSize: "0.4375rem",
                color: kpi.highlight ? C.red : C.goldDim,
                letterSpacing: "0.06em",
                marginTop: "0.5rem",
              }}>
                {kpi.delta}
              </p>
            </div>
          ))}
        </div>

        {/* ── 2. Row: Clients Requiring Action + Revenue Snapshot ───────── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem] xl:gap-10" style={{ marginBottom: "2.5rem" }}>

          {/* ── Clients Requiring Action ─────────────────────────────────── */}
          <section>
            <SectionHeader
              label="Clients Requiring Action"
              href="/admin/collections/clients"
              linkText="Manage Clients →"
            />
            {clientsNeedingAction.length === 0 ? (
              <EmptyState message="No clients flagged — all relationships healthy." />
            ) : (
              <Card>
                {clientsNeedingAction.map((client, i) => (
                  <div key={client.id} style={{
                    padding: "1rem 1.25rem",
                    borderBottom: i < clientsNeedingAction.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1rem",
                  }}>
                    <div style={{
                      width: "3px",
                      height: "100%",
                      minHeight: "2.5rem",
                      background: client.relationshipStatus === "at-risk" ? C.red : C.yellow,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-start justify-between gap-2">
                        <p style={{
                          fontFamily: C.sans,
                          fontWeight: 500,
                          fontSize: "0.875rem",
                          color: C.cream,
                        }}>
                          {client.name}
                        </p>
                        <Badge status={client.relationshipStatus ?? "healthy"} />
                      </div>
                      {client.nextAction && (
                        <p style={{
                          fontFamily: C.sans,
                          fontSize: "0.75rem",
                          color: "rgba(255,255,255,0.45)",
                          marginTop: "0.3rem",
                          lineHeight: 1.4,
                        }}>
                          {client.nextAction}
                        </p>
                      )}
                      {client.nextActionDueDate && (
                        <p style={{
                          fontFamily: C.sans,
                          fontSize: "0.5rem",
                          letterSpacing: "0.06em",
                          color: isPast(client.nextActionDueDate) ? C.red : "rgba(255,255,255,0.28)",
                          marginTop: "0.35rem",
                          textTransform: "uppercase",
                        }}>
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

          {/* ── Monthly Revenue Snapshot ──────────────────────────────────── */}
          <section>
            <SectionHeader
              label="Revenue Snapshot"
              href="/admin/collections/retainers"
              linkText="Manage Retainers →"
            />

            {/* MRR total */}
            <div style={{
              background: C.bgElevated,
              border: `1px solid ${C.border}`,
              padding: "1.25rem 1.5rem",
              marginBottom: "1px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}>
              <div>
                <Label>Monthly Recurring Revenue</Label>
                <p style={{
                  fontFamily: C.serif,
                  fontWeight: 300,
                  fontSize: "1.75rem",
                  lineHeight: 1,
                  color: totalMRR > 0 ? C.gold : C.creamMuted,
                  marginTop: "0.625rem",
                  letterSpacing: "-0.01em",
                }}>
                  {totalMRR > 0 ? fmtMoney(totalMRR) : "—"}
                </p>
                <p style={{
                  fontFamily: C.sans,
                  fontSize: "0.5rem",
                  color: "rgba(255,255,255,0.22)",
                  marginTop: "0.4rem",
                  letterSpacing: "0.06em",
                }}>
                  {activeRetainers.length} active retainer{activeRetainers.length !== 1 ? "s" : ""}
                  {overdueRetainers.length > 0 && ` · ${overdueRetainers.length} overdue`}
                </p>
              </div>
              {overdueRetainers.length > 0 && (
                <Badge status="overdue" />
              )}
            </div>

            {/* Retainer breakdown */}
            {allRetainers.length === 0 ? (
              <EmptyState message="No retainers configured yet." />
            ) : (
              <Card>
                {allRetainers.slice(0, 6).map((r, i) => (
                  <div key={r.id} style={{
                    padding: "0.8125rem 1.125rem",
                    borderBottom: i < Math.min(allRetainers.length, 6) - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{
                        fontFamily: C.sans,
                        fontSize: "0.8125rem",
                        color: C.cream,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {clientName(r.client)}
                      </p>
                      <p style={{
                        fontFamily: C.sans,
                        fontSize: "0.5rem",
                        color: "rgba(255,255,255,0.28)",
                        marginTop: "0.2rem",
                      }}>
                        {r.billingCadence ?? "monthly"}{r.nextInvoiceDate ? ` · Next: ${fmtDate(r.nextInvoiceDate)}` : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                      <p style={{
                        fontFamily: C.sans,
                        fontWeight: 300,
                        fontSize: "0.875rem",
                        color: C.creamMuted,
                      }}>
                        {r.monthlyAmount ? fmtMoney(r.monthlyAmount) : "—"}
                      </p>
                      <Badge status={r.billingStatus ?? "active"} />
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>

        {/* ── 3. This Month's Deliverables ────────────────────────────────── */}
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
              {/* Table head */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px,1fr) 130px 100px 90px 90px 90px",
                padding: "0.6875rem 1.25rem",
                borderBottom: `1px solid rgba(255,255,255,0.06)`,
                background: "rgba(255,255,255,0.02)",
                minWidth: "700px",
              }}>
                {["Deliverable","Client","Category","Status","Due","Owner"].map(h => (
                  <Label key={h}>{h}</Label>
                ))}
              </div>

              {monthDeliverables.map((d, i) => (
                <div key={d.id} style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px,1fr) 130px 100px 90px 90px 90px",
                  padding: "0.875rem 1.25rem",
                  borderBottom: i < monthDeliverables.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                  alignItems: "center",
                  minWidth: "700px",
                }}>
                  <p style={{
                    fontFamily: C.sans,
                    fontSize: "0.8125rem",
                    color: C.cream,
                    lineHeight: 1.3,
                    paddingRight: "0.75rem",
                  }}>
                    {d.title ?? "—"}
                  </p>
                  <p style={{
                    fontFamily: C.sans,
                    fontSize: "0.75rem",
                    color: C.creamMuted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {clientName(d.client)}
                  </p>
                  <p style={{
                    fontFamily: C.sans,
                    fontSize: "0.6875rem",
                    letterSpacing: "0.04em",
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "capitalize" as const,
                  }}>
                    {d.category ?? "—"}
                  </p>
                  <div><Badge status={d.status ?? "not-started"} /></div>
                  <p style={{
                    fontFamily: C.sans,
                    fontSize: "0.6875rem",
                    color: d.dueDate && isPast(d.dueDate) && d.status !== "complete" ? C.red : "rgba(255,255,255,0.35)",
                  }}>
                    {fmtDate(d.dueDate)}
                  </p>
                  <p style={{
                    fontFamily: C.sans,
                    fontSize: "0.6875rem",
                    color: "rgba(255,255,255,0.35)",
                  }}>
                    {d.owner ?? "—"}
                  </p>
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* ── 4. Row: Open Requests + Active Projects ──────────────────────── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:gap-10">

          {/* ── Open Client Requests ─────────────────────────────────────── */}
          <section>
            <SectionHeader
              label="Open Client Requests"
              href="/admin/collections/client-requests"
              linkText="Manage Requests →"
            />

            {sortedRequests.length === 0 ? (
              <EmptyState message="No open requests — inbox clear." />
            ) : (
              <Card>
                {sortedRequests.map((req, i) => (
                  <div key={req.id} style={{
                    padding: "0.875rem 1.125rem",
                    borderBottom: i < sortedRequests.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.875rem",
                  }}>
                    <PriorityBar priority={req.priority ?? "normal"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-start justify-between gap-2">
                        <p style={{
                          fontFamily: C.sans,
                          fontSize: "0.8125rem",
                          color: C.cream,
                          lineHeight: 1.3,
                          flex: 1,
                        }}>
                          {req.requestTitle ?? "—"}
                        </p>
                        <Badge status={req.status ?? "new"} />
                      </div>
                      <p style={{
                        fontFamily: C.sans,
                        fontSize: "0.5625rem",
                        color: "rgba(255,255,255,0.3)",
                        marginTop: "0.25rem",
                      }}>
                        {clientName(req.client)}
                        {req.requestType ? ` · ${req.requestType}` : ""}
                        {req.dueDate ? ` · Due ${fmtDate(req.dueDate)}` : ""}
                        {req.priority === "urgent" ? " · URGENT" : req.priority === "high" ? " · HIGH" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>

          {/* ── Active Projects ───────────────────────────────────────────── */}
          <section>
            <SectionHeader
              label="Active Projects"
              href="/admin/collections/client-projects"
              linkText="Manage Projects →"
            />

            {activeProjects.length === 0 ? (
              <EmptyState message="No active projects in delivery." />
            ) : (
              <Card>
                {activeProjects.map((proj, i) => (
                  <div key={proj.id} style={{
                    padding: "0.875rem 1.125rem",
                    borderBottom: i < activeProjects.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.875rem",
                  }}>
                    <PriorityBar priority={proj.priority ?? "normal"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-start justify-between gap-2">
                        <p style={{
                          fontFamily: C.sans,
                          fontSize: "0.8125rem",
                          color: C.cream,
                          lineHeight: 1.3,
                          flex: 1,
                        }}>
                          {proj.projectName ?? "—"}
                        </p>
                        <Badge status={proj.status ?? "planning"} />
                      </div>
                      <p style={{
                        fontFamily: C.sans,
                        fontSize: "0.5625rem",
                        color: "rgba(255,255,255,0.3)",
                        marginTop: "0.25rem",
                      }}>
                        {clientName(proj.client)}
                        {proj.projectType ? ` · ${proj.projectType}` : ""}
                        {proj.targetLaunchDate ? ` · Launch ${fmtDate(proj.targetLaunchDate)}` : ""}
                      </p>
                      {proj.nextAction && (
                        <p style={{
                          fontFamily: C.sans,
                          fontSize: "0.5625rem",
                          color: C.goldDim,
                          marginTop: "0.3rem",
                          lineHeight: 1.3,
                          fontStyle: "italic",
                        }}>
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

        {/* ── Footer note ─────────────────────────────────────────────────── */}
        <div style={{
          marginTop: "2.5rem",
          padding: "1rem 1.25rem",
          background: C.goldFaint,
          border: `1px solid ${C.borderGold}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap" as const,
          gap: "0.5rem",
        }}>
          <p style={{
            fontFamily: C.sans,
            fontSize: "0.5625rem",
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.22)",
          }}>
            KXD OS · Operations Command Center · Phase 2 · Live Payload data
          </p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {[
              ["/admin/collections/clients", "Clients"],
              ["/admin/collections/retainers", "Retainers"],
              ["/admin/collections/client-projects", "Projects"],
              ["/admin/collections/monthly-deliverables", "Deliverables"],
              ["/admin/collections/client-requests", "Requests"],
            ].map(([href, label]) => (
              <Link key={href} href={href} style={{
                fontFamily: C.sans,
                fontSize: "0.5rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: C.gold,
                opacity: 0.45,
                textDecoration: "none",
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
