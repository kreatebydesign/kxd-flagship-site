import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsFocusPill,
  OpsKpiStrip,
  OpsListRow,
  OpsQuickGrid,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import type { KxdBadgeVariant } from "@/components/os";
import { KxdPage } from "@/components/os";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

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
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  try {
    return new Date(iso) < new Date();
  } catch {
    return false;
  }
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

const STATUS_BADGE: Record<string, { label: string; variant: KxdBadgeVariant }> = {
  new: { label: "New", variant: "status" },
  triaged: { label: "Triaged", variant: "status" },
  drafting: { label: "Drafting", variant: "status" },
  "in-progress": { label: "In Progress", variant: "warning" },
  "waiting-on-client": { label: "Waiting", variant: "pending" },
  blocked: { label: "Blocked", variant: "critical" },
  complete: { label: "Complete", variant: "success" },
  "not-started": { label: "Not Started", variant: "status" },
  active: { label: "Active", variant: "status" },
  planning: { label: "Planning", variant: "status" },
  review: { label: "Review", variant: "pending" },
  overdue: { label: "Overdue", variant: "critical" },
  urgent: { label: "Urgent", variant: "critical" },
  high: { label: "High", variant: "warning" },
  current: { label: "Current", variant: "status" },
  paused: { label: "Paused", variant: "default" },
};

function getStatusBadge(status: string | null | undefined): { label: string; variant: KxdBadgeVariant } {
  if (!status) return { label: "Unknown", variant: "default" };
  return STATUS_BADGE[status] ?? { label: status, variant: "default" };
}

const PRIO_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

const PRIO_CLASS: Record<string, string> = {
  urgent: "kxd-os-ops-priority-bar--urgent",
  high: "kxd-os-ops-priority-bar--high",
  normal: "",
  low: "",
};

type FocusScore = "clear" | "active" | "elevated" | "critical";

const FOCUS_CFG: Record<
  FocusScore,
  {
    label: string;
    description: string;
    tone: "default" | "warning" | "critical" | "clear";
  }
> = {
  critical: {
    label: "Critical",
    description: "Urgent items require immediate attention.",
    tone: "critical",
  },
  elevated: {
    label: "Elevated",
    description: "Overdue items. Resolve before end of day.",
    tone: "warning",
  },
  active: {
    label: "Active",
    description: "Work due today. Stay on pace.",
    tone: "default",
  },
  clear: {
    label: "Clear",
    description: "No critical items. Operate at your own pace.",
    tone: "clear",
  },
};

function computeFocusScore(counts: {
  urgentReqs: number;
  overdueRetainers: number;
  overdueReqs: number;
  projectActions: number;
  delivToday: number;
  delivWeek: number;
  retainersWeek: number;
  creativeActive: number;
}): FocusScore {
  if (counts.urgentReqs > 0 || counts.overdueRetainers > 0) return "critical";
  if (counts.overdueReqs > 0 || counts.projectActions > 0) return "elevated";
  if (
    counts.delivToday > 0 ||
    counts.delivWeek > 0 ||
    counts.retainersWeek > 0 ||
    counts.creativeActive > 0
  ) {
    return "active";
  }
  return "clear";
}

export async function TodayScreen() {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const in7DaysEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  in7DaysEnd.setHours(23, 59, 59, 999);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const todayStartISO = todayStart.toISOString();
  const todayEndISO = todayEnd.toISOString();
  const in7DaysISO = in7DaysEnd.toISOString();
  const yesterdayISO = yesterday.toISOString();

  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  let overdueReqs: AnyDoc[] = [];
  let urgentReqs: AnyDoc[] = [];
  let delivToday: AnyDoc[] = [];
  let delivWeek: AnyDoc[] = [];
  let projectsAction: AnyDoc[] = [];
  let retainersWeek: AnyDoc[] = [];
  let overdueRetainers: AnyDoc[] = [];
  let flyerActive: AnyDoc[] = [];
  let videoActive: AnyDoc[] = [];
  let socialActive: AnyDoc[] = [];
  let newReqsToday: AnyDoc[] = [];

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
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-requests" as any,
        depth: 1,
        limit: 50,
        where: {
          and: [
            { status: { in: ["new", "triaged", "in-progress", "waiting-on-client"] } },
            { dueDate: { less_than_equal: todayEndISO } },
          ],
        },
        sort: "priority",
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-requests" as any,
        depth: 1,
        limit: 30,
        where: {
          and: [
            { priority: { equals: "urgent" } },
            { status: { in: ["new", "triaged", "in-progress", "waiting-on-client"] } },
          ],
        },
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "monthly-deliverables" as any,
        depth: 1,
        limit: 30,
        where: {
          and: [
            { dueDate: { greater_than_equal: todayStartISO } },
            { dueDate: { less_than_equal: todayEndISO } },
            { status: { not_in: ["complete"] } },
          ],
        },
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "monthly-deliverables" as any,
        depth: 1,
        limit: 50,
        where: {
          and: [
            { dueDate: { greater_than: todayEndISO } },
            { dueDate: { less_than_equal: in7DaysISO } },
            { status: { not_in: ["complete"] } },
          ],
        },
        sort: "dueDate",
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-projects" as any,
        depth: 1,
        limit: 30,
        where: {
          and: [
            { nextActionDueDate: { less_than_equal: todayEndISO } },
            { status: { in: ["active", "planning", "review", "waiting-on-client"] } },
          ],
        },
        sort: "priority",
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "retainers" as any,
        depth: 1,
        limit: 20,
        where: {
          and: [
            { nextInvoiceDate: { greater_than_equal: todayStartISO } },
            { nextInvoiceDate: { less_than_equal: in7DaysISO } },
          ],
        },
        sort: "nextInvoiceDate",
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "retainers" as any,
        depth: 1,
        limit: 20,
        where: { billingStatus: { equals: "overdue" } },
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "flyer-requests" as any,
        depth: 1,
        limit: 8,
        where: { status: { not_in: ["complete", "archived"] } },
        sort: "-createdAt",
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "promo-video-requests" as any,
        depth: 1,
        limit: 8,
        where: { status: { not_in: ["complete", "archived"] } },
        sort: "-createdAt",
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "social-post-requests" as any,
        depth: 1,
        limit: 8,
        where: { status: { not_in: ["complete", "archived"] } },
        sort: "-createdAt",
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-requests" as any,
        depth: 1,
        limit: 10,
        where: { createdAt: { greater_than_equal: yesterdayISO } },
        sort: "-createdAt",
      }),
    ]);

    if (overdueReqsR.status === "fulfilled") overdueReqs = overdueReqsR.value.docs as AnyDoc[];
    if (urgentReqsR.status === "fulfilled") urgentReqs = urgentReqsR.value.docs as AnyDoc[];
    if (delivTodayR.status === "fulfilled") delivToday = delivTodayR.value.docs as AnyDoc[];
    if (delivWeekR.status === "fulfilled") delivWeek = delivWeekR.value.docs as AnyDoc[];
    if (projectsActionR.status === "fulfilled") projectsAction = projectsActionR.value.docs as AnyDoc[];
    if (retainersWeekR.status === "fulfilled") retainersWeek = retainersWeekR.value.docs as AnyDoc[];
    if (overdueRetainersR.status === "fulfilled") {
      overdueRetainers = overdueRetainersR.value.docs as AnyDoc[];
    }
    if (flyerActiveR.status === "fulfilled") flyerActive = flyerActiveR.value.docs as AnyDoc[];
    if (videoActiveR.status === "fulfilled") videoActive = videoActiveR.value.docs as AnyDoc[];
    if (socialActiveR.status === "fulfilled") socialActive = socialActiveR.value.docs as AnyDoc[];
    if (newReqsTodayR.status === "fulfilled") newReqsToday = newReqsTodayR.value.docs as AnyDoc[];
  } catch {
    // Payload unavailable — all sections degrade to their empty states
  }

  const reqMap = new Map<number, AnyDoc>();
  for (const r of [...overdueReqs, ...urgentReqs]) {
    if (!reqMap.has(r.id as number)) reqMap.set(r.id as number, r);
  }
  const allFlaggedReqs = Array.from(reqMap.values()).sort(
    (a, b) => (PRIO_ORDER[a.priority ?? "normal"] ?? 2) - (PRIO_ORDER[b.priority ?? "normal"] ?? 2),
  );

  const creativeQueue: Array<{
    title: string;
    type: string;
    client: string;
    status: string;
  }> = [
    ...flyerActive.map((d) => ({
      title: (d.flyerTitle as string) ?? "Untitled Flyer",
      type: "Flyer",
      client: resolveName(d.client, "—"),
      status: (d.status as string) ?? "new",
    })),
    ...videoActive.map((d) => ({
      title: (d.videoTitle as string) ?? "Untitled Video",
      type: "Video",
      client: resolveName(d.client, "—"),
      status: (d.status as string) ?? "new",
    })),
    ...socialActive.map((d) => ({
      title: (d.postTitle as string) ?? "Untitled Post",
      type: "Social",
      client: resolveName(d.client, "—"),
      status: (d.status as string) ?? "new",
    })),
  ];

  const healthMap = new Map<number, { name: string; issues: string[] }>();
  function addIssue(rel: AnyDoc | number | null | undefined, issue: string) {
    const id = resolveId(rel);
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
      issues.some((i) => i.includes("Retainer") || i.includes("Urgent")) ? 0 : 1;
    return sev(a.issues) - sev(b.issues);
  });

  const focusScore = computeFocusScore({
    urgentReqs: urgentReqs.length,
    overdueRetainers: overdueRetainers.length,
    overdueReqs: overdueReqs.length,
    projectActions: projectsAction.length,
    delivToday: delivToday.length,
    delivWeek: delivWeek.length,
    retainersWeek: retainersWeek.length,
    creativeActive: creativeQueue.length,
  });
  const focus = FOCUS_CFG[focusScore];

  const kpiItems = [
    {
      label: "Overdue Items",
      value: String(allFlaggedReqs.length),
      sub: "Requests past due or urgent",
      alert: allFlaggedReqs.length > 0,
    },
    {
      label: "Due Today",
      value: String(delivToday.length),
      sub: "Deliverables — today",
      alert: delivToday.length > 0,
    },
    {
      label: "Due This Week",
      value: String(delivWeek.length),
      sub: "Deliverables — next 7 days",
      alert: false,
    },
    {
      label: "Action Overdue",
      value: String(projectsAction.length),
      sub: "Projects — next action past due",
      alert: projectsAction.length > 0,
    },
    {
      label: "Invoices — 7 Days",
      value: String(retainersWeek.length + overdueRetainers.length),
      sub: overdueRetainers.length > 0 ? `${overdueRetainers.length} overdue` : "Upcoming only",
      alert: overdueRetainers.length > 0,
    },
    {
      label: "Creative Queue",
      value: String(creativeQueue.length),
      sub: "Flyers · Videos · Social",
      alert: false,
    },
  ];

  const quickActions = [
    { label: "Log Request", sub: "New client request", href: "/admin/operations/requests/new" },
    { label: "Operations Hub", sub: "Studio overview", href: "/admin/operations" },
    { label: "Accounts", sub: "Strategic intelligence", href: "/admin/operations/accounts" },
    { label: "Founder", sub: "Studio overview", href: "/admin/operations/founder" },
    { label: "Creative Engine", sub: "Campaigns & assets", href: "/admin/operations/creative" },
    { label: "Payload CMS", sub: "Content & data", href: "/admin" },
    { label: "All Requests", sub: "Client requests", href: "/admin/collections/client-requests" },
    {
      label: "Deliverables",
      sub: "Monthly tracking",
      href: "/admin/collections/monthly-deliverables",
    },
    { label: "Projects", sub: "Active delivery", href: "/admin/collections/client-projects" },
    { label: "Retainers", sub: "Revenue records", href: "/admin/collections/retainers" },
    {
      label: "Campaigns",
      sub: "Creative campaigns",
      href: "/admin/collections/creative-campaigns",
    },
    { label: "Flyers", sub: "Flyer queue", href: "/admin/collections/flyer-requests" },
    { label: "Videos", sub: "Video queue", href: "/admin/collections/promo-video-requests" },
    { label: "Social Posts", sub: "Social queue", href: "/admin/collections/social-post-requests" },
  ] as const;

  return (
    <OperationsShell activeId="today" dateDisplay={dateDisplay}>
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Studio Overview"
          title="Today"
          lead={`${dateDisplay} · Loaded ${timeDisplay} · Refreshes on each page request`}
        />

        <div className="kxd-os-ops-hero-row">
          <div>
            <h2 className="kxd-os-display">{dateDisplay}</h2>
            <p className="kxd-os-meta">Loaded {timeDisplay} · Refreshes on each page request</p>
          </div>
          <OpsFocusPill label={focus.label} description={focus.description} tone={focus.tone} />
        </div>

        <section className="kxd-os-ops-section">
          <OpsSectionHead label="Daily Focus" />
          <OpsKpiStrip items={kpiItems} />
        </section>

        <section className="kxd-os-ops-section">
          <OpsSectionHead
            label="Overdue & Urgent Requests"
            count={allFlaggedReqs.length}
            href="/admin/collections/client-requests"
            linkText="Manage Requests →"
          />
          {allFlaggedReqs.length === 0 ? (
            <OpsEmpty message="Clear. No overdue or urgent requests in the queue." />
          ) : (
            <OpsCard>
              {allFlaggedReqs.map((req) => {
                const status = getStatusBadge((req.status as string) ?? "new");
                return (
                  <OpsListRow key={req.id as number}>
                    <span
                      className={`kxd-os-ops-priority-bar ${PRIO_CLASS[(req.priority as string) ?? "normal"]}`}
                      aria-hidden="true"
                    />
                    <div className="kxd-os-ops-list-row__main">
                      <div className="flex items-start justify-between gap-3">
                        <p className="kxd-os-ops-list-row__title">
                          {(req.requestTitle as string) ?? "—"}
                        </p>
                        <div className="flex items-center gap-2">
                          {(req.priority as string) === "urgent" ? (
                            <OpsStatusBadge label="Urgent" variant="critical" />
                          ) : null}
                          <OpsStatusBadge label={status.label} variant={status.variant} />
                        </div>
                      </div>
                      <p className="kxd-os-ops-list-row__meta">
                        {resolveName(req.client)}
                        {req.requestType ? ` · ${req.requestType as string}` : ""}
                        {req.dueDate ? ` · Due ${fmtDateShort(req.dueDate as string)}` : ""}
                        {req.dueDate && isPast(req.dueDate as string) ? " · OVERDUE" : ""}
                      </p>
                    </div>
                  </OpsListRow>
                );
              })}
            </OpsCard>
          )}
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:gap-10">
          <section className="kxd-os-ops-section">
            <OpsSectionHead
              label="Deliverables — Due Today"
              count={delivToday.length}
              href="/admin/collections/monthly-deliverables"
              linkText="Manage →"
            />
            {delivToday.length === 0 ? (
              <OpsEmpty message="Clear. Nothing due today." />
            ) : (
              <OpsCard>
                {delivToday.map((d) => {
                  const status = getStatusBadge((d.status as string) ?? "not-started");
                  return (
                    <OpsListRow key={d.id as number}>
                      <div className="kxd-os-ops-list-row__main">
                        <div className="flex items-start justify-between gap-3">
                          <p className="kxd-os-ops-list-row__title">{(d.title as string) ?? "—"}</p>
                          <OpsStatusBadge label={status.label} variant={status.variant} />
                        </div>
                        <p className="kxd-os-ops-list-row__meta">
                          {resolveName(d.client)}
                          {d.category ? ` · ${d.category as string}` : ""}
                          {d.owner ? ` · ${d.owner as string}` : ""}
                        </p>
                      </div>
                    </OpsListRow>
                  );
                })}
              </OpsCard>
            )}
          </section>

          <section className="kxd-os-ops-section">
            <OpsSectionHead
              label="Deliverables — This Week"
              count={delivWeek.length}
              href="/admin/collections/monthly-deliverables"
              linkText="Manage →"
            />
            {delivWeek.length === 0 ? (
              <OpsEmpty message="Clean week ahead. No deliverables due in the next 7 days." />
            ) : (
              <OpsCard>
                {delivWeek.map((d) => {
                  const status = getStatusBadge((d.status as string) ?? "not-started");
                  return (
                    <OpsListRow key={d.id as number}>
                      <div className="kxd-os-ops-list-row__main">
                        <div className="flex items-start justify-between gap-3">
                          <p className="kxd-os-ops-list-row__title">{(d.title as string) ?? "—"}</p>
                          <div className="flex items-center gap-2">
                            <p className="kxd-os-meta">{fmtDateShort(d.dueDate as string)}</p>
                            <OpsStatusBadge label={status.label} variant={status.variant} />
                          </div>
                        </div>
                        <p className="kxd-os-ops-list-row__meta">
                          {resolveName(d.client)}
                          {d.category ? ` · ${d.category as string}` : ""}
                          {d.owner ? ` · ${d.owner as string}` : ""}
                        </p>
                      </div>
                    </OpsListRow>
                  );
                })}
              </OpsCard>
            )}
          </section>
        </div>

        <section className="kxd-os-ops-section">
          <OpsSectionHead
            label="Projects — Action Required"
            count={projectsAction.length}
            href="/admin/collections/client-projects"
            linkText="Manage Projects →"
          />
          {projectsAction.length === 0 ? (
            <OpsEmpty message="No projects with overdue next actions. All delivery tracks are clear." />
          ) : (
            <OpsCard>
              {projectsAction.map((proj) => {
                const status = getStatusBadge((proj.status as string) ?? "active");
                return (
                  <OpsListRow key={proj.id as number}>
                    <span
                      className={`kxd-os-ops-priority-bar ${PRIO_CLASS[(proj.priority as string) ?? "normal"]}`}
                      aria-hidden="true"
                    />
                    <div className="kxd-os-ops-list-row__main">
                      <div className="flex items-start justify-between gap-3">
                        <p className="kxd-os-ops-list-row__title">
                          {(proj.projectName as string) ?? "—"}
                        </p>
                        <OpsStatusBadge label={status.label} variant={status.variant} />
                      </div>
                      {proj.nextAction ? (
                        <p className="kxd-os-ops-list-row__meta">→ {proj.nextAction as string}</p>
                      ) : null}
                      <p className="kxd-os-ops-list-row__meta">
                        {resolveName(proj.client)}
                        {proj.projectType ? ` · ${proj.projectType as string}` : ""}
                        {proj.nextActionDueDate
                          ? ` · Action due ${fmtDateShort(proj.nextActionDueDate as string)} — OVERDUE`
                          : ""}
                      </p>
                    </div>
                  </OpsListRow>
                );
              })}
            </OpsCard>
          )}
        </section>

        <section className="kxd-os-ops-section">
          <OpsSectionHead
            label="Revenue Watch — Next 7 Days"
            href="/admin/collections/retainers"
            linkText="Manage Retainers →"
          />
          {overdueRetainers.length === 0 && retainersWeek.length === 0 ? (
            <OpsEmpty message="Revenue watch is clean for the next 7 days." />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {overdueRetainers.length > 0 ? (
                <OpsCard>
                  <div className="px-6 py-4">
                    <p className="kxd-os-meta">Overdue Retainers — Payment Required</p>
                  </div>
                  {overdueRetainers.map((r) => (
                    <OpsListRow key={r.id as number}>
                      <div className="kxd-os-ops-list-row__main">
                        <div className="flex items-start justify-between gap-3">
                          <p className="kxd-os-ops-list-row__title">{resolveName(r.client)}</p>
                          <p className="kxd-os-ops-list-row__title">
                            {r.monthlyAmount ? fmtMoney(r.monthlyAmount as number) : "—"}
                          </p>
                        </div>
                        <p className="kxd-os-ops-list-row__meta">
                          {(r.retainerName as string) ?? "Retainer"}
                          {r.nextInvoiceDate ? ` · Was due ${fmtDateShort(r.nextInvoiceDate as string)}` : ""}
                        </p>
                      </div>
                      <OpsStatusBadge label="Overdue" variant="critical" />
                    </OpsListRow>
                  ))}
                </OpsCard>
              ) : null}

              {retainersWeek.length > 0 ? (
                <OpsCard>
                  {retainersWeek.map((r) => {
                    const days = daysUntil(r.nextInvoiceDate as string);
                    const billing = getStatusBadge((r.billingStatus as string) ?? "active");
                    return (
                      <OpsListRow key={r.id as number}>
                        <div className="kxd-os-ops-list-row__main">
                          <div className="flex items-start justify-between gap-3">
                            <p className="kxd-os-ops-list-row__title">{resolveName(r.client)}</p>
                            <p className="kxd-os-ops-list-row__title">
                              {r.monthlyAmount ? fmtMoney(r.monthlyAmount as number) : "—"}
                            </p>
                          </div>
                          <p className="kxd-os-ops-list-row__meta">
                            {(r.retainerName as string) ?? "Retainer"} · Due{" "}
                            {fmtDateShort(r.nextInvoiceDate as string)}
                            {days !== null
                              ? ` · ${days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}`
                              : ""}
                          </p>
                        </div>
                        <OpsStatusBadge label={billing.label} variant={billing.variant} />
                      </OpsListRow>
                    );
                  })}
                </OpsCard>
              ) : null}
            </div>
          )}
        </section>

        <section className="kxd-os-ops-section">
          <OpsSectionHead
            label="Client Health Alerts"
            count={clientAlerts.length}
            href="/admin/collections/clients"
            linkText="Manage Clients →"
          />
          {clientAlerts.length === 0 ? (
            <OpsEmpty message="All client health signals clear — no flags detected today." />
          ) : (
            <OpsCard>
              {clientAlerts.map((client) => (
                <OpsListRow key={client.name}>
                  <div className="kxd-os-ops-list-row__main">
                    <p className="kxd-os-ops-list-row__title">{client.name}</p>
                    <p className="kxd-os-ops-list-row__meta">{client.issues.join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {client.issues.map((issue) => (
                      <OpsStatusBadge
                        key={`${client.name}-${issue}`}
                        label={issue}
                        variant={
                          issue.includes("Retainer") || issue.includes("Urgent") || issue.includes("overdue")
                            ? "critical"
                            : "warning"
                        }
                      />
                    ))}
                  </div>
                </OpsListRow>
              ))}
            </OpsCard>
          )}
        </section>

        <section className="kxd-os-ops-section">
          <OpsSectionHead
            label="Creative Queue — Active Work"
            count={creativeQueue.length}
            href="/admin/operations/creative"
            linkText="Creative Engine →"
          />
          {creativeQueue.length === 0 ? (
            <OpsEmpty message="No active creative work in the queue." />
          ) : (
            <OpsCard>
              {creativeQueue.map((item, i) => {
                const status = getStatusBadge(item.status);
                return (
                  <OpsListRow key={`${item.type}-${item.title}-${i}`}>
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{item.title}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {item.client} · {item.type}
                      </p>
                    </div>
                    <OpsStatusBadge label={status.label} variant={status.variant} />
                  </OpsListRow>
                );
              })}
            </OpsCard>
          )}
        </section>

        <section className="kxd-os-ops-section">
          <OpsSectionHead
            label="New Since Yesterday"
            count={newReqsToday.length}
            href="/admin/collections/client-requests"
            linkText="View All Requests →"
          />
          {newReqsToday.length === 0 ? (
            <OpsEmpty message="No new requests in the last 24 hours." />
          ) : (
            <OpsCard>
              {newReqsToday.map((req) => {
                const status = getStatusBadge((req.status as string) ?? "new");
                return (
                  <OpsListRow key={req.id as number}>
                    <div className="kxd-os-ops-list-row__main">
                      <p className="kxd-os-ops-list-row__title">{(req.requestTitle as string) ?? "—"}</p>
                      <p className="kxd-os-ops-list-row__meta">
                        {resolveName(req.client)}
                        {req.requestType ? ` · ${req.requestType as string}` : ""}
                        {" · Received "}
                        {fmtDate(req.createdAt as string)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(req.priority as string) === "urgent" ? (
                        <OpsStatusBadge label="Urgent" variant="critical" />
                      ) : null}
                      <OpsStatusBadge label={status.label} variant={status.variant} />
                    </div>
                  </OpsListRow>
                );
              })}
            </OpsCard>
          )}
        </section>

        <section className="kxd-os-ops-section">
          <OpsSectionHead label="Quick Actions" />
          <OpsQuickGrid items={[...quickActions]} />
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4">
          <p className="kxd-os-meta">
            KXD OS · Studio Overview · Phase 2F · Live Payload data · Refreshes on each request
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {([
              ["/admin/operations", "Operations"],
              ["/admin/operations/creative", "Creative"],
              ["/admin/operations/growth", "Growth"],
              ["/admin/operations/accounts", "Accounts"],
              ["/admin/operations/founder", "Founder"],
              ["/admin", "Payload"],
            ] as [string, string][]).map(([href, label]) => (
              <Link key={href} href={href} className="kxd-os-link-quiet">
                {label} →
              </Link>
            ))}
          </div>
        </footer>
      </KxdPage>
    </OperationsShell>
  );
}
