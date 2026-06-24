/**
 * /admin/operations/today
 * KXD OS — Studio Overview
 * Phase 2F
 *
 * A daily-focus surface for the KXD founder. Opens each morning to a live
 * read of everything that demands attention: overdue work, today's
 * deliverables, project actions, revenue watch, the creative queue,
 * and a consolidated client health read.
 *
 * Architecture:
 *   — export const dynamic = "force-dynamic"  (live on every request)
 *   — 11 parallel Payload queries via Promise.allSettled
 *   — Full graceful degradation: any failed query returns an empty section
 *   — No writes, no mutations, no schema dependencies beyond existing fields
 *   — Self-contained styling: C tokens, inline styles, Tailwind layout classes
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
  green:        "#C9A962",
  teal:         "#A8B4C8",
  blue:         "#A8B4C8",
  purple:       "#C4B0D8",
  border:       "rgba(255,255,255,0.08)",
  borderGold:   "rgba(255,255,255,0.04)",
  borderRed:    "rgba(210,90,90,0.25)",
  serif:        "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans:         "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveId(rel: AnyDoc | number | null | undefined): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  return ((rel as AnyDoc).id as number) ?? null;
}

function resolveName(rel: AnyDoc | number | null | undefined, fallback = "—"): string {
  if (!rel) return fallback;
  if (typeof rel === "object") return ((rel as AnyDoc).name as string) || fallback;
  return `#${rel}`;
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
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  } catch { return null; }
}

// ── Status / priority config ──────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "new":               { label: "New",         color: "#C9A962", bg: "rgba(255,255,255,0.035)",  border: "rgba(201,169,98,0.16)" },
  "triaged":           { label: "Triaged",      color: "#A8B4C8", bg: "rgba(255,255,255,0.035)", border: "rgba(168,180,200,0.3)" },
  "drafting":          { label: "Drafting",     color: "#A8B4C8", bg: "rgba(255,255,255,0.035)", border: "rgba(168,180,200,0.3)" },
  "in-progress":       { label: "In Progress",  color: "#E8C468", bg: "rgba(255,255,255,0.04)",  border: "rgba(232,196,104,0.3)" },
  "waiting-on-client": { label: "Waiting",      color: "#C4B0D8", bg: "rgba(255,255,255,0.035)", border: "rgba(196,176,216,0.3)" },
  "blocked":           { label: "Blocked",      color: "#d25a5a", bg: "rgba(255,255,255,0.04)",   border: "rgba(210,90,90,0.3)" },
  "complete":          { label: "Complete",     color: "#C9A962", bg: "rgba(255,255,255,0.035)",  border: "rgba(201,169,98,0.16)" },
  "not-started":       { label: "Not Started",  color: "#A8B4C8", bg: "rgba(255,255,255,0.035)", border: "rgba(168,180,200,0.3)" },
  "active":            { label: "Active",       color: "#C9A962", bg: "rgba(255,255,255,0.035)",  border: "rgba(201,169,98,0.16)" },
  "planning":          { label: "Planning",     color: "#A8B4C8", bg: "rgba(255,255,255,0.035)", border: "rgba(168,180,200,0.3)" },
  "review":            { label: "Review",       color: "#C4B0D8", bg: "rgba(255,255,255,0.035)", border: "rgba(196,176,216,0.3)" },
  "overdue":           { label: "Overdue",      color: "#d25a5a", bg: "rgba(255,255,255,0.04)",   border: "rgba(210,90,90,0.3)" },
  "urgent":            { label: "Urgent",       color: "#d25a5a", bg: "rgba(255,255,255,0.04)",   border: "rgba(210,90,90,0.3)" },
  "high":              { label: "High",         color: "#E8C468", bg: "rgba(255,255,255,0.04)",  border: "rgba(232,196,104,0.3)" },
  "current":           { label: "Current",      color: "#C9A962", bg: "rgba(255,255,255,0.035)",  border: "rgba(201,169,98,0.16)" },
  "paused":            { label: "Paused",       color: "rgba(136,136,128,1)", bg: "rgba(136,136,128,0.08)", border: "rgba(136,136,128,0.3)" },
};

const PRIO_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

const PRIO_COLOR: Record<string, string> = {
  urgent: "#d25a5a",
  high:   "#E8C468",
  normal: "rgba(255,255,255,0.15)",
  low:    "rgba(255,255,255,0.08)",
};

// ── Daily Focus Score ─────────────────────────────────────────────────────────

type FocusScore = "clear" | "active" | "elevated" | "critical";

const FOCUS_CFG: Record<FocusScore, {
  label: string; color: string; bg: string; border: string; dot: string; description: string;
}> = {
  critical: {
    label:       "Critical",
    color:       "#d25a5a",
    bg:          "rgba(255,255,255,0.04)",
    border:      "rgba(210,90,90,0.28)",
    dot:         "#d25a5a",
    description: "Urgent items require immediate attention.",
  },
  elevated: {
    label:       "Elevated",
    color:       "#E8C468",
    bg:          "rgba(255,255,255,0.04)",
    border:      "rgba(232,196,104,0.28)",
    dot:         "#E8C468",
    description: "Overdue items. Resolve before end of day.",
  },
  active: {
    label:       "Active",
    color:       "#C9A962",
    bg:          "rgba(255,255,255,0.035)",
    border:      "rgba(201,169,98,0.28)",
    dot:         "#C9A962",
    description: "Work due today. Stay on pace.",
  },
  clear: {
    label:       "Clear",
    color:       "#C9A962",
    bg:          "rgba(255,255,255,0.035)",
    border:      "rgba(201,169,98,0.28)",
    dot:         "#C9A962",
    description: "No critical items. Operate at your own pace.",
  },
};

function computeFocusScore(counts: {
  urgentReqs:       number;
  overdueRetainers: number;
  overdueReqs:      number;
  projectActions:   number;
  delivToday:       number;
  delivWeek:        number;
  retainersWeek:    number;
  creativeActive:   number;
}): FocusScore {
  if (counts.urgentReqs > 0 || counts.overdueRetainers > 0) return "critical";
  if (counts.overdueReqs > 0 || counts.projectActions > 0)  return "elevated";
  if (
    counts.delivToday > 0 || counts.delivWeek > 0 ||
    counts.retainersWeek > 0 || counts.creativeActive > 0
  ) return "active";
  return "clear";
}

// ── Primitive UI components ───────────────────────────────────────────────────

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
  const b = STATUS_BADGE[status] ?? {
    label: status, color: "rgba(255,255,255,0.3)",
    bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)",
  };
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
  return (
    <div style={{
      width: "2px", height: "2.25rem", flexShrink: 0, marginTop: "0.125rem",
      background: PRIO_COLOR[priority] ?? PRIO_COLOR.normal,
    }} />
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
            fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.1em",
            color: C.goldDim, background: C.goldFaint,
            border: `1px solid ${C.borderGold}`, padding: "0.15rem 0.5rem", display: "inline-block",
          }}>
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link href={href} style={{
          fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: "rgba(255,255,255,0.22)", textDecoration: "none",
        }}>
          {linkText ?? "View →"}
        </Link>
      )}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
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
        fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.06em",
        color: "rgba(255,255,255,0.2)", fontStyle: "italic",
      }}>
        {message}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TodayPage() {
  const now = new Date();

  // Date window boundaries
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const in7DaysEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  in7DaysEnd.setHours(23, 59, 59, 999);
  const yesterday  = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const todayStartISO = todayStart.toISOString();
  const todayEndISO   = todayEnd.toISOString();
  const in7DaysISO    = in7DaysEnd.toISOString();
  const yesterdayISO  = yesterday.toISOString();

  // Display strings
  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // ── Parallel Payload queries ───────────────────────────────────────────────

  let overdueReqs:      AnyDoc[] = [];
  let urgentReqs:       AnyDoc[] = [];
  let delivToday:       AnyDoc[] = [];
  let delivWeek:        AnyDoc[] = [];
  let projectsAction:   AnyDoc[] = [];
  let retainersWeek:    AnyDoc[] = [];
  let overdueRetainers: AnyDoc[] = [];
  let flyerActive:      AnyDoc[] = [];
  let videoActive:      AnyDoc[] = [];
  let socialActive:     AnyDoc[] = [];
  let newReqsToday:     AnyDoc[] = [];

  try {
    const payload = await getPayload({ config });

    const [
      overdueReqsR,
      urgentReqsR,
      delivTodayR,
      delivWeekR,
      projectsActionR,
      retainersWeekR,
      overdueRetainersR,
      flyerActiveR,
      videoActiveR,
      socialActiveR,
      newReqsTodayR,
    ] = await Promise.allSettled([
      // 1. Requests overdue by due date
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-requests" as any,
        depth: 1, limit: 50,
        where: {
          and: [
            { status:  { in: ["new","triaged","in-progress","waiting-on-client"] } },
            { dueDate: { less_than_equal: todayEndISO } },
          ],
        },
        sort: "priority",
      }),
      // 2. Urgent requests — regardless of due date
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-requests" as any,
        depth: 1, limit: 30,
        where: {
          and: [
            { priority: { equals: "urgent" } },
            { status:   { in: ["new","triaged","in-progress","waiting-on-client"] } },
          ],
        },
      }),
      // 3. Deliverables due today
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "monthly-deliverables" as any,
        depth: 1, limit: 30,
        where: {
          and: [
            { dueDate: { greater_than_equal: todayStartISO } },
            { dueDate: { less_than_equal:    todayEndISO   } },
            { status:  { not_in: ["complete"] } },
          ],
        },
      }),
      // 4. Deliverables due this week (tomorrow → +7 days)
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "monthly-deliverables" as any,
        depth: 1, limit: 50,
        where: {
          and: [
            { dueDate: { greater_than:    todayEndISO } },
            { dueDate: { less_than_equal: in7DaysISO  } },
            { status:  { not_in: ["complete"] } },
          ],
        },
        sort: "dueDate",
      }),
      // 5. Projects with overdue next action
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-projects" as any,
        depth: 1, limit: 30,
        where: {
          and: [
            { nextActionDueDate: { less_than_equal: todayEndISO } },
            { status: { in: ["active","planning","review","waiting-on-client"] } },
          ],
        },
        sort: "priority",
      }),
      // 6. Retainers with invoice due in the next 7 days
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "retainers" as any,
        depth: 1, limit: 20,
        where: {
          and: [
            { nextInvoiceDate: { greater_than_equal: todayStartISO } },
            { nextInvoiceDate: { less_than_equal:    in7DaysISO    } },
          ],
        },
        sort: "nextInvoiceDate",
      }),
      // 7. Overdue retainers
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "retainers" as any,
        depth: 1, limit: 20,
        where: { billingStatus: { equals: "overdue" } },
      }),
      // 8–10. Active creative requests (not complete / archived)
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "flyer-requests" as any,
        depth: 1, limit: 8,
        where: { status: { not_in: ["complete","archived"] } },
        sort: "-createdAt",
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "promo-video-requests" as any,
        depth: 1, limit: 8,
        where: { status: { not_in: ["complete","archived"] } },
        sort: "-createdAt",
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "social-post-requests" as any,
        depth: 1, limit: 8,
        where: { status: { not_in: ["complete","archived"] } },
        sort: "-createdAt",
      }),
      // 11. New requests in the last 24 hours
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-requests" as any,
        depth: 1, limit: 10,
        where: { createdAt: { greater_than_equal: yesterdayISO } },
        sort: "-createdAt",
      }),
    ]);

    if (overdueReqsR.status      === "fulfilled") overdueReqs      = overdueReqsR.value.docs      as AnyDoc[];
    if (urgentReqsR.status       === "fulfilled") urgentReqs       = urgentReqsR.value.docs        as AnyDoc[];
    if (delivTodayR.status       === "fulfilled") delivToday       = delivTodayR.value.docs        as AnyDoc[];
    if (delivWeekR.status        === "fulfilled") delivWeek        = delivWeekR.value.docs         as AnyDoc[];
    if (projectsActionR.status   === "fulfilled") projectsAction   = projectsActionR.value.docs    as AnyDoc[];
    if (retainersWeekR.status    === "fulfilled") retainersWeek    = retainersWeekR.value.docs     as AnyDoc[];
    if (overdueRetainersR.status === "fulfilled") overdueRetainers = overdueRetainersR.value.docs  as AnyDoc[];
    if (flyerActiveR.status      === "fulfilled") flyerActive      = flyerActiveR.value.docs       as AnyDoc[];
    if (videoActiveR.status      === "fulfilled") videoActive      = videoActiveR.value.docs       as AnyDoc[];
    if (socialActiveR.status     === "fulfilled") socialActive     = socialActiveR.value.docs      as AnyDoc[];
    if (newReqsTodayR.status     === "fulfilled") newReqsToday     = newReqsTodayR.value.docs      as AnyDoc[];
  } catch {
    // Payload unavailable — all sections degrade to their empty states
  }

  // ── Deduplicate overdue + urgent requests by id ───────────────────────────

  const reqMap = new Map<number, AnyDoc>();
  for (const r of [...overdueReqs, ...urgentReqs]) {
    if (!reqMap.has(r.id as number)) reqMap.set(r.id as number, r);
  }
  const allFlaggedReqs = Array.from(reqMap.values()).sort(
    (a, b) =>
      (PRIO_ORDER[a.priority ?? "normal"] ?? 2) -
      (PRIO_ORDER[b.priority ?? "normal"] ?? 2)
  );

  // ── Creative queue ────────────────────────────────────────────────────────

  const creativeQueue: Array<{
    title: string; type: string; client: string; status: string;
  }> = [
    ...flyerActive.map(d => ({
      title:  (d.flyerTitle  as string) ?? "Untitled Flyer",
      type:   "Flyer",
      client: resolveName(d.client, "—"),
      status: (d.status as string) ?? "new",
    })),
    ...videoActive.map(d => ({
      title:  (d.videoTitle  as string) ?? "Untitled Video",
      type:   "Video",
      client: resolveName(d.client, "—"),
      status: (d.status as string) ?? "new",
    })),
    ...socialActive.map(d => ({
      title:  (d.postTitle   as string) ?? "Untitled Post",
      type:   "Social",
      client: resolveName(d.client, "—"),
      status: (d.status as string) ?? "new",
    })),
  ];

  // ── Client health alerts (derived from fetched data — no extra queries) ──

  const healthMap = new Map<number, { name: string; issues: string[] }>();

  function addIssue(rel: AnyDoc | number | null | undefined, issue: string) {
    const id   = resolveId(rel);
    const name = resolveName(rel, "Unknown Client");
    if (!id) return;
    const entry = healthMap.get(id) ?? { name, issues: [] };
    if (!entry.issues.includes(issue)) entry.issues.push(issue);
    healthMap.set(id, entry);
  }

  for (const req of allFlaggedReqs) {
    addIssue(req.client, req.priority === "urgent" ? "Urgent request open" : "Overdue request");
  }
  for (const proj of projectsAction) {
    addIssue(proj.client, "Project action overdue");
  }
  for (const d of delivToday) {
    addIssue(d.client, "Deliverable due today");
  }
  for (const r of overdueRetainers) {
    addIssue(r.client, "Retainer overdue — payment required");
  }

  const clientAlerts = Array.from(healthMap.values()).sort((a, b) => {
    const sev = (issues: string[]) =>
      issues.some(i => i.includes("Retainer") || i.includes("Urgent")) ? 0 : 1;
    return sev(a.issues) - sev(b.issues);
  });

  // ── Daily Focus Score ────────────────────────────────────────────────────

  const focusScore = computeFocusScore({
    urgentReqs:       urgentReqs.length,
    overdueRetainers: overdueRetainers.length,
    overdueReqs:      overdueReqs.length,
    projectActions:   projectsAction.length,
    delivToday:       delivToday.length,
    delivWeek:        delivWeek.length,
    retainersWeek:    retainersWeek.length,
    creativeActive:   creativeQueue.length,
  });
  const focus = FOCUS_CFG[focusScore];

  // ── KPI strip ────────────────────────────────────────────────────────────

  const KPI = [
    {
      label: "Overdue Items",
      value: String(allFlaggedReqs.length),
      sub:   "Requests past due or urgent",
      alert: allFlaggedReqs.length > 0,
      accentColor: "#d25a5a",
    },
    {
      label: "Due Today",
      value: String(delivToday.length),
      sub:   "Deliverables — today",
      alert: delivToday.length > 0,
      accentColor: "#E8C468",
    },
    {
      label: "Due This Week",
      value: String(delivWeek.length),
      sub:   "Deliverables — next 7 days",
      alert: false,
      accentColor: C.cream,
    },
    {
      label: "Action Overdue",
      value: String(projectsAction.length),
      sub:   "Projects — next action past due",
      alert: projectsAction.length > 0,
      accentColor: "#E8C468",
    },
    {
      label: "Invoices — 7 Days",
      value: String(retainersWeek.length + overdueRetainers.length),
      sub:   overdueRetainers.length > 0
        ? `${overdueRetainers.length} overdue`
        : "Upcoming only",
      alert: overdueRetainers.length > 0,
      accentColor: "#d25a5a",
    },
    {
      label: "Creative Queue",
      value: String(creativeQueue.length),
      sub:   "Flyers · Videos · Social",
      alert: false,
      accentColor: C.cream,
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
              <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "0.6875rem" }}>◆</span>
              <div>
                <p style={{
                  fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem",
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: C.creamMuted, lineHeight: 1,
                }}>
                  Today
                </p>
                <p className="hidden sm:block" style={{
                  fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginTop: "0.35rem",
                }}>
                  Studio Overview
                </p>
              </div>
              <span style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.6875rem",
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(201,169,98,0.75)", background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(201,169,98,0.2)", padding: "0.2rem 0.6rem",
              }}>
                Phase 2F
              </span>
            </div>

            <div className="flex items-center gap-5">
              <Link href="/admin/operations/executive" style={{
                fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                textDecoration: "none",
              }}>
                ← Operations
              </Link>
              <Link href="/admin/operations/creative" style={{
                fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                textDecoration: "none",
              }}>
                Creative →
              </Link>
              <Link href="/admin/operations/growth" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: C.gold, opacity: 0.8, textDecoration: "none",
              }}>
                Growth →
              </Link>
              <Link href="/admin/operations/accounts" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: C.purple, opacity: 0.8, textDecoration: "none",
              }}>
                Accounts →
              </Link>
              <Link href="/admin/operations/founder" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem",
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: C.gold, opacity: 0.8, textDecoration: "none",
              }}>
                Founder →
              </Link>
              <Link href="/admin" style={{
                fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem",
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

        {/* ── 1. Day header ─────────────────────────────────────────────── */}
        <div style={{
          marginBottom: "2.5rem", paddingBottom: "2rem",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <p style={{
            fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.2em",
            textTransform: "uppercase", color: C.goldDim, marginBottom: "0.875rem",
          }}>
            KXD OS · Studio Overview
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
                fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.2)", marginTop: "0.625rem",
              }}>
                Loaded {timeDisplay} · Refreshes on each page request
              </p>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.875rem",
              background: focus.bg, border: `1px solid ${focus.border}`,
              padding: "0.875rem 1.375rem",
            }}>
              <div style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: focus.dot, flexShrink: 0,
              }} />
              <div>
                <p style={{
                  fontFamily: C.sans, fontWeight: 600, fontSize: "0.8125rem",
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  color: focus.color, lineHeight: 1,
                }}>
                  {focus.label}
                </p>
                <p style={{
                  fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.04em",
                  color: "rgba(255,255,255,0.3)", marginTop: "0.375rem",
                }}>
                  {focus.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. KPI Strip ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: "0.875rem" }}>
          <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>Daily Focus</Label>
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
                fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.22)", marginTop: "0.375rem",
              }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── 3. Overdue & Urgent Requests ──────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Overdue & Urgent Requests"
            count={allFlaggedReqs.length}
            href="/admin/collections/client-requests"
            linkText="Manage Requests →"
          />
          {allFlaggedReqs.length === 0 ? (
            <EmptyState message="Clear. No overdue or urgent requests in the queue." />
          ) : (
            <Card>
              {allFlaggedReqs.map((req, i) => (
                <div
                  key={req.id as number}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "0",
                    padding: "0",
                    borderBottom: i < allFlaggedReqs.length - 1
                      ? `1px solid rgba(255,255,255,0.04)` : "none",
                    borderLeft: `3px solid ${PRIO_COLOR[req.priority ?? "normal"] ?? PRIO_COLOR.normal}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, padding: "0.875rem 1.125rem" }}>
                    <div className="flex items-start justify-between gap-2">
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.8125rem",
                        color: C.cream, lineHeight: 1.3, flex: 1,
                      }}>
                        {(req.requestTitle as string) ?? "—"}
                      </p>
                      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                        {(req.priority as string) === "urgent" && <Badge status="urgent" />}
                        <Badge status={(req.status as string) ?? "new"} />
                      </div>
                    </div>
                    <p style={{
                      fontFamily: C.sans, fontSize: "0.8125rem",
                      color: "rgba(255,255,255,0.3)", marginTop: "0.3rem", letterSpacing: "0.02em",
                    }}>
                      {resolveName(req.client)}
                      {req.requestType ? ` · ${req.requestType as string}` : ""}
                      {req.dueDate ? ` · Due ${fmtDateShort(req.dueDate as string)}` : ""}
                      {req.dueDate && isPast(req.dueDate as string) ? (
                        <span style={{ color: "#d25a5a" }}> · OVERDUE</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* ── 4 & 5. Deliverables ───────────────────────────────────────── */}
        <div
          className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:gap-10"
          style={{ marginBottom: "2.5rem" }}
        >
          {/* Deliverables — today */}
          <section>
            <SectionHeader
              label="Deliverables — Due Today"
              count={delivToday.length}
              href="/admin/collections/monthly-deliverables"
              linkText="Manage →"
            />
            {delivToday.length === 0 ? (
              <EmptyState message="Clear. Nothing due today." />
            ) : (
              <Card>
                {delivToday.map((d, i) => (
                  <div key={d.id as number} style={{
                    padding: "0.875rem 1.125rem",
                    borderBottom: i < delivToday.length - 1
                      ? `1px solid rgba(255,255,255,0.04)` : "none",
                  }}>
                    <div className="flex items-start justify-between gap-2">
                      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, lineHeight: 1.3, flex: 1 }}>
                        {(d.title as string) ?? "—"}
                      </p>
                      <Badge status={(d.status as string) ?? "not-started"} />
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.3rem" }}>
                      {resolveName(d.client)}
                      {d.category ? ` · ${d.category as string}` : ""}
                      {d.owner ? ` · ${d.owner as string}` : ""}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </section>

          {/* Deliverables — this week */}
          <section>
            <SectionHeader
              label="Deliverables — This Week"
              count={delivWeek.length}
              href="/admin/collections/monthly-deliverables"
              linkText="Manage →"
            />
            {delivWeek.length === 0 ? (
              <EmptyState message="Clean week ahead. No deliverables due in the next 7 days." />
            ) : (
              <Card>
                {delivWeek.map((d, i) => (
                  <div key={d.id as number} style={{
                    padding: "0.875rem 1.125rem",
                    borderBottom: i < delivWeek.length - 1
                      ? `1px solid rgba(255,255,255,0.04)` : "none",
                  }}>
                    <div className="flex items-start justify-between gap-2">
                      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, lineHeight: 1.3, flex: 1 }}>
                        {(d.title as string) ?? "—"}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.06em", color: C.teal }}>
                          {fmtDateShort(d.dueDate as string)}
                        </p>
                        <Badge status={(d.status as string) ?? "not-started"} />
                      </div>
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.3rem" }}>
                      {resolveName(d.client)}
                      {d.category ? ` · ${d.category as string}` : ""}
                      {d.owner ? ` · ${d.owner as string}` : ""}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>

        {/* ── 6. Projects Requiring Attention ───────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Projects — Action Required"
            count={projectsAction.length}
            href="/admin/collections/client-projects"
            linkText="Manage Projects →"
          />
          {projectsAction.length === 0 ? (
            <EmptyState message="No projects with overdue next actions. All delivery tracks are clear." />
          ) : (
            <Card>
              {projectsAction.map((proj, i) => (
                <div key={proj.id as number} style={{
                  display: "flex", alignItems: "flex-start", gap: "0.875rem",
                  padding: "0.875rem 1.125rem",
                  borderBottom: i < projectsAction.length - 1
                    ? `1px solid rgba(255,255,255,0.04)` : "none",
                }}>
                  <PriorityBar priority={(proj.priority as string) ?? "normal"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-start justify-between gap-2">
                      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, lineHeight: 1.3, flex: 1 }}>
                        {(proj.projectName as string) ?? "—"}
                      </p>
                      <Badge status={(proj.status as string) ?? "active"} />
                    </div>
                    {proj.nextAction && (
                      <p style={{
                        fontFamily: C.sans, fontSize: "0.75rem", color: C.goldDim,
                        marginTop: "0.35rem", lineHeight: 1.4, fontStyle: "italic",
                      }}>
                        → {proj.nextAction as string}
                      </p>
                    )}
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.3rem" }}>
                      {resolveName(proj.client)}
                      {proj.projectType ? ` · ${proj.projectType as string}` : ""}
                      {proj.nextActionDueDate && (
                        <span style={{ color: "#d25a5a" }}>
                          {" · Action due "}{fmtDateShort(proj.nextActionDueDate as string)}{" — OVERDUE"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* ── 7. Revenue Watch ──────────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Revenue Watch — Next 7 Days"
            href="/admin/collections/retainers"
            linkText="Manage Retainers →"
          />
          {overdueRetainers.length === 0 && retainersWeek.length === 0 ? (
            <EmptyState message="Revenue watch is clean for the next 7 days." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "1px" }}>
              {overdueRetainers.length > 0 && (
                <div style={{
                  background: C.bgElevated, border: `1px solid ${C.borderRed}`,
                }}>
                  <div style={{
                    padding: "0.625rem 1.25rem",
                    borderBottom: `1px solid rgba(210,90,90,0.1)`,
                    background: "rgba(210,90,90,0.03)",
                  }}>
                    <Label style={{ color: "#d25a5a" }}>Overdue Retainers — Payment Required</Label>
                  </div>
                  {overdueRetainers.map((r, i) => (
                    <div
                      key={r.id as number}
                      style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", gap: "0.75rem",
                        padding: "0.875rem 1.25rem",
                        borderBottom: i < overdueRetainers.length - 1
                          ? `1px solid rgba(255,255,255,0.04)` : "none",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream }}>
                          {resolveName(r.client)}
                        </p>
                        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.2rem" }}>
                          {(r.retainerName as string) ?? "Retainer"}
                          {r.nextInvoiceDate ? ` · Was due ${fmtDateShort(r.nextInvoiceDate as string)}` : ""}
                        </p>
                      </div>
                      <p style={{ fontFamily: C.sans, fontWeight: 300, fontSize: "0.875rem", color: "#d25a5a", flexShrink: 0 }}>
                        {r.monthlyAmount ? fmtMoney(r.monthlyAmount as number) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {retainersWeek.length > 0 && (
                <Card>
                  {retainersWeek.map((r, i) => {
                    const days = daysUntil(r.nextInvoiceDate as string);
                    const dayColor = days === 0 ? "#d25a5a" : days !== null && days <= 2 ? "#E8C468" : "#A8B4C8";
                    return (
                      <div
                        key={r.id as number}
                        style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", gap: "0.75rem",
                          padding: "0.875rem 1.25rem",
                          borderBottom: i < retainersWeek.length - 1
                            ? `1px solid rgba(255,255,255,0.04)` : "none",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream }}>
                            {resolveName(r.client)}
                          </p>
                          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.2rem" }}>
                            {(r.retainerName as string) ?? "Retainer"} · Due {fmtDateShort(r.nextInvoiceDate as string)}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                          {days !== null && (
                            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.06em", color: dayColor }}>
                              {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                            </p>
                          )}
                          <p style={{ fontFamily: C.sans, fontWeight: 300, fontSize: "0.875rem", color: C.cream }}>
                            {r.monthlyAmount ? fmtMoney(r.monthlyAmount as number) : "—"}
                          </p>
                          <Badge status={(r.billingStatus as string) ?? "active"} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
              )}
            </div>
          )}
        </section>

        {/* ── 8. Client Health Alerts ───────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Client Health Alerts"
            count={clientAlerts.length}
            href="/admin/collections/clients"
            linkText="Manage Clients →"
          />
          {clientAlerts.length === 0 ? (
            <div style={{
              background: C.bgElevated, border: `1px solid rgba(201,169,98,0.2)`,
              padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem",
            }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: C.gold, flexShrink: 0,
              }} />
              <p style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.gold, letterSpacing: "0.04em" }}>
                All client health signals clear — no flags detected today.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-3"
              style={{ background: C.border }}
            >
              {clientAlerts.map((client) => {
                const hasSevere = client.issues.some(i =>
                  i.includes("Retainer") || i.includes("Urgent")
                );
                return (
                  <div
                    key={client.name}
                    style={{
                      background: C.bgElevated, padding: "1rem 1.25rem",
                      borderLeft: `3px solid ${hasSevere ? "#d25a5a" : "#E8C468"}`,
                    }}
                  >
                    <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.875rem", color: C.cream, marginBottom: "0.5rem" }}>
                      {client.name}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.3rem" }}>
                      {client.issues.map(issue => (
                        <p key={issue} style={{
                          fontFamily: C.sans, fontSize: "0.6875rem",
                          color: issue.includes("Retainer") || issue.includes("Urgent") || issue.includes("overdue")
                            ? "#d25a5a" : "#E8C468",
                          display: "flex", alignItems: "center", gap: "0.4rem",
                        }}>
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

        {/* ── 9. Creative Queue ─────────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="Creative Queue — Active Work"
            count={creativeQueue.length}
            href="/admin/operations/creative"
            linkText="Creative Engine →"
          />
          {creativeQueue.length === 0 ? (
            <EmptyState message="No active creative work in the queue." />
          ) : (
            <Card>
              {creativeQueue.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    padding: "0.8125rem 1.125rem",
                    borderBottom: i < creativeQueue.length - 1
                      ? `1px solid rgba(255,255,255,0.04)` : "none",
                  }}
                >
                  <span style={{
                    fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)",
                    padding: "0.15rem 0.5rem", border: `1px solid rgba(255,255,255,0.08)`,
                    flexShrink: 0, whiteSpace: "nowrap" as const, width: "3.5rem",
                    textAlign: "center" as const,
                  }}>
                    {item.type}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream, lineHeight: 1.3 }}>
                      {item.title}
                    </p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.2rem" }}>
                      {item.client}
                    </p>
                  </div>
                  <Badge status={item.status} />
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* ── 10. New Since Yesterday ───────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            label="New Since Yesterday"
            count={newReqsToday.length}
            href="/admin/collections/client-requests"
            linkText="View All Requests →"
          />
          {newReqsToday.length === 0 ? (
            <EmptyState message="No new requests in the last 24 hours." />
          ) : (
            <Card>
              {newReqsToday.map((req, i) => (
                <div key={req.id as number} style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  padding: "0.8125rem 1.125rem",
                  borderBottom: i < newReqsToday.length - 1
                    ? `1px solid rgba(255,255,255,0.04)` : "none",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.cream }}>
                      {(req.requestTitle as string) ?? "—"}
                    </p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.2rem" }}>
                      {resolveName(req.client)}
                      {req.requestType ? ` · ${req.requestType as string}` : ""}
                      {" · Received "}
                      {fmtDate(req.createdAt as string)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                    {(req.priority as string) === "urgent" && <Badge status="urgent" />}
                    <Badge status={(req.status as string) ?? "new"} />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* ── 11. Quick Actions ─────────────────────────────────────────── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <Label style={{ color: C.goldDim, letterSpacing: "0.16em" }}>Quick Actions</Label>
          </div>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
            style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}` }}
          >
            {([
              { label: "Log Request",     sub: "New client request",   href: "/admin/operations/requests/new" },
              { label: "Operations Hub",  sub: "Studio overview",       href: "/admin/operations" },
              { label: "Accounts",        sub: "Strategic intelligence", href: "/admin/operations/accounts" },
              { label: "Founder",         sub: "Studio overview",        href: "/admin/operations/founder" },
              { label: "Creative Engine", sub: "Campaigns & assets",   href: "/admin/operations/creative" },
              { label: "Payload CMS",     sub: "Content & data",       href: "/admin" },
              { label: "All Requests",    sub: "Client requests",      href: "/admin/collections/client-requests" },
              { label: "Deliverables",    sub: "Monthly tracking",     href: "/admin/collections/monthly-deliverables" },
              { label: "Projects",        sub: "Active delivery",      href: "/admin/collections/client-projects" },
              { label: "Retainers",       sub: "Revenue records",      href: "/admin/collections/retainers" },
              { label: "Campaigns",       sub: "Creative campaigns",   href: "/admin/collections/creative-campaigns" },
              { label: "Flyers",          sub: "Flyer queue",          href: "/admin/collections/flyer-requests" },
              { label: "Videos",          sub: "Video queue",          href: "/admin/collections/promo-video-requests" },
              { label: "Social Posts",    sub: "Social queue",         href: "/admin/collections/social-post-requests" },
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
                  fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.22)", marginTop: "0.3rem", textTransform: "uppercase" as const,
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
            fontFamily: C.sans, fontSize: "0.8125rem",
            letterSpacing: "0.08em", color: "rgba(255,255,255,0.22)",
          }}>
            KXD OS · Studio Overview · Phase 2F · Live Payload data · Refreshes on each request
          </p>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" as const }}>
            {([
              ["/admin/operations",           "Operations"],
              ["/admin/operations/creative", "Creative"],
              ["/admin/operations/growth",   "Growth"],
              ["/admin/operations/accounts", "Accounts"],
              ["/admin/operations/founder",  "Founder"],
              ["/admin",                     "Payload"],
            ] as [string, string][]).map(([href, label]) => (
              <Link key={href} href={href} style={{
                fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em",
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
