/**
 * KXD OS — Operations Suite
 * /admin/operations/command — Phase 2D
 *
 * Live Payload data: Clients, Retainers, ClientProjects,
 * MonthlyDeliverables, ClientRequests.
 *
 * force-dynamic: fetches live data on every request.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  CommandScreen,
  type ClientDoc,
  type DeliverableDoc,
  type ProjectDoc,
  type RequestDoc,
  type RetainerDoc,
} from "@/components/admin/operations/command/CommandScreen";

export const dynamic = "force-dynamic";

function clientId(c: number | ClientDoc | null | undefined): number | null {
  if (!c) return null;
  if (typeof c === "object") return c.id;
  return c;
}

function clientTier(c: number | ClientDoc | null | undefined): string {
  if (!c || typeof c !== "object") return "other";
  return c.brandTier ?? "other";
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

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default async function OperationsPage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let allClients: ClientDoc[] = [];
  let allRetainers: RetainerDoc[] = [];
  let activeProjects: ProjectDoc[] = [];
  let monthDeliverables: DeliverableDoc[] = [];
  let openRequests: RequestDoc[] = [];

  try {
    const payload = await getPayload({ config });

    const [clientsR, retainersR, projectsR, delivR, reqsR] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "clients" as any, limit: 200, depth: 1, sort: "name" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "retainers" as any, limit: 100, depth: 1 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({
        collection: "client-projects" as any,
        limit: 100,
        depth: 1,
        where: { status: { in: ["planning", "active", "waiting-on-client", "review"] } },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({
        collection: "monthly-deliverables" as any,
        limit: 100,
        depth: 1,
        where: {
          and: [{ month: { equals: currentMonth } }, { year: { equals: currentYear } }],
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({
        collection: "client-requests" as any,
        limit: 100,
        depth: 1,
        where: { status: { in: ["new", "triaged", "in-progress", "waiting-on-client"] } },
      }),
    ]);

    if (clientsR.status === "fulfilled") allClients = clientsR.value.docs as ClientDoc[];
    if (retainersR.status === "fulfilled") allRetainers = retainersR.value.docs as RetainerDoc[];
    if (projectsR.status === "fulfilled") activeProjects = projectsR.value.docs as ProjectDoc[];
    if (delivR.status === "fulfilled") monthDeliverables = delivR.value.docs as DeliverableDoc[];
    if (reqsR.status === "fulfilled") openRequests = reqsR.value.docs as RequestDoc[];
  } catch {
    // Payload unavailable — all sections degrade to empty states.
  }

  const activeClients = allClients.filter((c) => c.status === "active");
  const activeRetainers = allRetainers.filter(
    (r) => r.billingStatus === "active" || r.billingStatus === "current",
  );
  const overdueRetainers = allRetainers.filter((r) => r.billingStatus === "overdue");

  const upcomingInvoices = allRetainers
    .filter((r) => {
      if (!r.nextInvoiceDate) return false;
      const d = new Date(r.nextInvoiceDate);
      return d >= now && d <= in14Days;
    })
    .sort((a, b) => new Date(a.nextInvoiceDate!).getTime() - new Date(b.nextInvoiceDate!).getTime());

  const totalMRR = activeRetainers.reduce((s, r) => s + (r.monthlyAmount ?? 0), 0);

  const tierRevenue: Record<string, number> = {};
  for (const r of activeRetainers) {
    const tier = clientTier(r.client);
    tierRevenue[tier] = (tierRevenue[tier] ?? 0) + (r.monthlyAmount ?? 0);
  }
  const tierRevenueEntries = Object.entries(tierRevenue).sort((a, b) => b[1] - a[1]);

  const healthIssues = new Map<number, string[]>();
  function addIssue(cid: number, msg: string) {
    const arr = healthIssues.get(cid) ?? [];
    if (!arr.includes(msg)) arr.push(msg);
    healthIssues.set(cid, arr);
  }

  for (const r of overdueRetainers) {
    const cid = clientId(r.client);
    if (cid) addIssue(cid, "Retainer overdue");
  }

  const clientsWithDeliv = new Set(
    monthDeliverables.map((d) => clientId(d.client)).filter(Boolean),
  );
  const clientsWithActiveRetainer = new Set(
    activeRetainers.map((r) => clientId(r.client)).filter(Boolean),
  );
  for (const cid of clientsWithActiveRetainer) {
    if (cid && !clientsWithDeliv.has(cid)) {
      addIssue(cid, "No deliverables logged this month");
    }
  }

  const PRIO_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedRequests = [...openRequests].sort(
    (a, b) => (PRIO_ORDER[a.priority ?? "normal"] ?? 2) - (PRIO_ORDER[b.priority ?? "normal"] ?? 2),
  );
  for (const req of openRequests.filter((r) => r.priority === "urgent")) {
    const cid = clientId(req.client);
    if (cid) addIssue(cid, "Urgent request open");
  }

  const flaggedClients = activeClients
    .filter((c) => healthIssues.has(c.id))
    .map((c) => ({ ...c, issues: healthIssues.get(c.id) ?? [] }));

  const atRiskClients = allClients.filter(
    (c) => c.relationshipStatus === "at-risk" || c.relationshipStatus === "needs-attention",
  );
  const pastDueActionClients = allClients.filter(
    (c) => c.nextActionDueDate && isPast(c.nextActionDueDate),
  );
  const clientsNeedingAction = Array.from(
    new Map([...atRiskClients, ...pastDueActionClients].map((c) => [c.id, c])).values(),
  );

  const openDeliverables = monthDeliverables.filter((d) => d.status !== "complete");

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
      delta:
        overdueRetainers.length > 0
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
      delta:
        activeRetainers.length > 0
          ? `${activeRetainers.length} retainer${activeRetainers.length !== 1 ? "s" : ""}`
          : "No retainers yet",
      alert: false,
    },
    {
      label: "Health Signals",
      value: String(flaggedClients.length),
      sub: "Clients flagged",
      delta:
        flaggedClients.length === 0
          ? "All clear"
          : `${overdueRetainers.length} overdue · ${openRequests.filter((r) => r.priority === "urgent").length} urgent`,
      alert: flaggedClients.length > 0,
    },
    {
      label: "Open Requests",
      value: String(openRequests.length),
      sub: "Triaged + active",
      delta:
        sortedRequests.filter((r) => r.priority === "urgent" || r.priority === "high").length > 0
          ? `${sortedRequests.filter((r) => r.priority === "urgent" || r.priority === "high").length} high priority`
          : "No urgent items",
      alert: openRequests.some((r) => r.priority === "urgent"),
    },
    {
      label: "Deliverables This Month",
      value: `${openDeliverables.length}/${monthDeliverables.length}`,
      sub: `${MONTH_NAMES[currentMonth - 1]} ${currentYear} open / total`,
      delta:
        monthDeliverables.filter((d) => d.status === "blocked").length > 0
          ? `${monthDeliverables.filter((d) => d.status === "blocked").length} blocked`
          : monthDeliverables.length === 0
            ? "None logged yet"
            : "No blockers",
      alert: monthDeliverables.some((d) => d.status === "blocked"),
    },
  ];

  return (
    <CommandScreen
      today={today}
      monthName={MONTH_NAMES[currentMonth - 1]}
      currentYear={currentYear}
      kpis={KPI}
      flaggedClients={flaggedClients}
      tierRevenueEntries={tierRevenueEntries}
      totalMRR={totalMRR}
      overdueRetainers={overdueRetainers}
      upcomingInvoices={upcomingInvoices}
      allRetainersCount={allRetainers.length}
      clientsNeedingAction={clientsNeedingAction}
      monthDeliverables={monthDeliverables}
      sortedRequests={sortedRequests}
      activeProjects={activeProjects}
    />
  );
}
