/**
 * lib/founder-dashboard.ts
 * KXD OS — Founder Dashboard 2.0 aggregations (read-only).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getOnboardingWorkflowStatus } from "@/lib/client-onboarding";
import { getCampaignHealthScores } from "@/lib/creative-intelligence";
import { getRankTitle } from "@/lib/junior-creators/ranks";
import { getWeekKey, minutesBetween } from "@/lib/junior-creators/week";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const OPEN_REQUEST_STATUSES = new Set(["new", "triaged", "in-progress", "waiting-on-client"]);
const ACTIVE_PROJECT_STATUSES = new Set(["planning", "active", "waiting-on-client", "review"]);

const TIER_RANK: Record<string, number> = {
  flagship: 4, growth: 3, maintenance: 2, internal: 1,
};

export type FounderSnapshotMetric = {
  id: string;
  label: string;
  value: string;
  sub: string;
  href?: string;
  alert?: boolean;
};

export type FounderFocusItem = {
  id: string;
  label: string;
  detail: string;
  urgency: "critical" | "high" | "medium";
  href?: string;
};

export type GrowthPipelineData = {
  auditsSubmitted: number;
  auditsNew30d: number;
  researchLeadsSubmitted: number;
  researchLeadsNew30d: number;
  qualifiedOpportunities: number;
  closedOpportunities: number;
};

export type TeamMemberActivity = {
  id: number;
  displayName: string;
  leadsSubmitted: number;
  leadsThisWeek: number;
  hoursWorkedMinutes: number;
  hoursLabel: string;
  rankTitle: string;
  activeNow: boolean;
};

export type ClientHealthClient = {
  clientId: number;
  name: string;
  status: "healthy" | "needs-attention" | "at-risk" | "paused" | string;
  mrr: number;
  grade: string;
  href: string;
};

export type ClientHealthSummary = {
  healthy: number;
  needsAttention: number;
  atRisk: number;
  topClients: ClientHealthClient[];
};

export type RevenueView = {
  mrr: number;
  arr: number;
  activeRetainers: number;
  retainerClients: number;
  topAccounts: Array<{ name: string; mrr: number; pct: number }>;
};

export type FounderNote = {
  id: string;
  category: string;
  title: string;
  body: string;
};

export type FounderDashboardData = {
  dateDisplay: string;
  timeDisplay: string;
  snapshot: FounderSnapshotMetric[];
  todaysFocus: FounderFocusItem[];
  growthPipeline: GrowthPipelineData;
  teamActivity: TeamMemberActivity[];
  clientHealth: ClientHealthSummary;
  revenue: RevenueView;
  founderNotes: FounderNote[];
};

export const FOUNDER_NOTES: FounderNote[] = [
  {
    id: "priorities",
    category: "Priorities",
    title: "This week's focus",
    body: "Protect delivery quality on active retainers. Clear onboarding blockers. Review growth pipeline weekly — audits and research leads are early signal.",
  },
  {
    id: "reminders",
    category: "Reminders",
    title: "Studio rhythm",
    body: "Check client health before taking new scope. Confirm renewals 30 days out. Keep junior research notes detailed enough for qualification.",
  },
  {
    id: "vision",
    category: "Vision",
    title: "Where KXD is heading",
    body: "Build a premium creative operations platform — client infrastructure, growth systems, and studio delivery running through one OS.",
  },
];

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

function fmtHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try { return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000); }
  catch { return null; }
}

interface AccountScore {
  clientId: number;
  name: string;
  tier: string;
  status: string;
  mrr: number;
  score: number;
  grade: "A" | "B" | "C" | "D";
  flags: string[];
  renewalDate: string | null;
}

function scoreAccount(
  client: AnyDoc,
  retainers: AnyDoc[],
  requests: AnyDoc[],
  projects: AnyDoc[],
): AccountScore {
  const cid = client.id as number;
  const name = String(client.name || "Unknown");
  const tier = String(client.brandTier || "maintenance");
  const status = String(client.relationshipStatus || "healthy");
  const mrr = Number(client.monthlyRetainerAmount) || 0;

  const cRetainers = retainers.filter((r) => clientId(r.client) === cid);
  const cRequests = requests.filter((r) => clientId(r.client) === cid);
  const cProjects = projects.filter((p) => clientId(p.client) === cid);

  const activeRet = cRetainers.find((r) => r.billingStatus === "active" || r.billingStatus === "pending");
  const renewalDate = String(activeRet?.renewalDate ?? "") || null;

  let s = 0;
  const flags: string[] = [];

  s += (TIER_RANK[tier] ?? 1) * 6;
  if (mrr >= 10_000) s += 20;
  else if (mrr >= 5_000) s += 14;
  else if (mrr >= 2_500) s += 8;
  else if (mrr > 0) s += 3;
  else flags.push("No active retainer");

  if (status === "healthy") s += 20;
  else if (status === "needs-attention") { s += 10; flags.push("Needs attention"); }
  else if (status === "at-risk") flags.push("Relationship at risk");

  const activeProj = cProjects.filter((p) => ACTIVE_PROJECT_STATUSES.has(String(p.status)));
  if (activeProj.length >= 2) s += 15;
  else if (activeProj.length === 1) s += 8;
  else flags.push("No active projects");

  const recentReqs = cRequests.filter((r) => r.createdAt && Date.now() - new Date(r.createdAt).getTime() < 90 * 86_400_000);
  if (recentReqs.length >= 3) s += 10;
  else if (recentReqs.length >= 1) s += 5;

  if (client.nextAction) s += 10;
  if (activeRet?.billingStatus === "overdue") flags.push("Billing overdue");

  const clamped = Math.min(s, 100);
  const grade = clamped >= 80 ? "A" : clamped >= 60 ? "B" : clamped >= 40 ? "C" : "D";

  return { clientId: cid, name, tier, status, mrr, score: clamped, grade, flags, renewalDate };
}

async function findAll(collection: string, limit = 500): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collection as any,
      limit,
      depth: 1,
    });
    return result.docs as AnyDoc[];
  } catch {
    return [];
  }
}

export async function getFounderDashboardData(): Promise<FounderDashboardData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const weekKey = getWeekKey();
  const weekStart = new Date(weekKey);
  weekStart.setHours(0, 0, 0, 0);

  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const [
    clients,
    retainers,
    projects,
    requests,
    audits,
    researchLeads,
    onboardings,
    juniorUsers,
    juniorShifts,
    campaignHealth,
  ] = await Promise.all([
    findAll("clients"),
    findAll("retainers"),
    findAll("client-projects"),
    findAll("client-requests"),
    findAll("website-audits"),
    findAll("research-leads"),
    findAll("client-onboarding"),
    findAll("junior-creator-users"),
    findAll("junior-creator-shifts"),
    getCampaignHealthScores(),
  ]);

  const activeClients = clients.filter((c) => c.status === "active");
  const activeProjects = projects.filter((p) => ACTIVE_PROJECT_STATUSES.has(String(p.status)));
  const openRequests = requests.filter((r) => OPEN_REQUEST_STATUSES.has(String(r.status)));
  const overdueRequests = openRequests.filter((r) => r.dueDate && new Date(r.dueDate as string) < now);

  const newAudits30d = audits.filter((a) => new Date(a.createdAt as string) >= thirtyDaysAgo);
  const newResearchLeads30d = researchLeads.filter((l) => new Date(l.createdAt as string) >= thirtyDaysAgo);

  const qualifiedLeads = researchLeads.filter((l) =>
    ["qualified", "contacted", "closed-won"].includes(String(l.status)),
  );
  const closedLeads = researchLeads.filter((l) => String(l.status) === "closed-won");

  const onboardingOpen = onboardings.filter((o) =>
    ["draft", "sent", "in-progress"].includes(String(o.status)),
  );
  const onboardingWaitingKxd = onboardingOpen.filter(
    (o) => getOnboardingWorkflowStatus(o) === "waiting-on-kxd",
  );

  const activeRetainers = retainers.filter(
    (r) => r.billingStatus === "active" || r.billingStatus === "current" || r.billingStatus === "pending",
  );
  const retainerClientIds = new Set(
    activeRetainers.map((r) => clientId(r.client)).filter((id): id is number => id != null),
  );

  const totalMRR = activeClients.reduce((s, c) => s + (Number(c.monthlyRetainerAmount) || 0), 0);
  const mrrFromRetainers = activeRetainers.reduce((s, r) => s + (Number(r.monthlyAmount) || 0), 0);
  const mrr = totalMRR > 0 ? totalMRR : mrrFromRetainers;

  const allScores = activeClients.map((c) => scoreAccount(c, retainers, requests, projects));
  const healthyCount = allScores.filter((a) => a.status === "healthy").length;
  const needsAttentionCount = allScores.filter((a) => a.status === "needs-attention").length;
  const atRiskCount = allScores.filter((a) => a.status === "at-risk" || a.flags.includes("Billing overdue")).length;

  const topClients = [...allScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((a) => ({
      clientId: a.clientId,
      name: a.name,
      status: a.status,
      mrr: a.mrr,
      grade: a.grade,
      href: `/admin/collections/clients/${a.clientId}`,
    }));

  const withMRR = allScores.filter((a) => a.mrr > 0).sort((a, b) => b.mrr - a.mrr);
  const topAccounts = withMRR.slice(0, 6).map((a) => ({
    name: a.name,
    mrr: a.mrr,
    pct: mrr > 0 ? Math.round((a.mrr / mrr) * 100) : 0,
  }));

  // Junior creator team activity
  const leadsByUser: Record<number, AnyDoc[]> = {};
  for (const lead of researchLeads) {
    const uid = Number(lead.juniorCreatorUser);
    if (!uid) continue;
    if (!leadsByUser[uid]) leadsByUser[uid] = [];
    leadsByUser[uid].push(lead);
  }

  const teamActivity: TeamMemberActivity[] = (juniorUsers as AnyDoc[])
    .filter((u) => u.active !== false)
    .map((user) => {
      const uid = user.id as number;
      const userLeads = leadsByUser[uid] ?? [];
      const userShifts = juniorShifts.filter(
        (s) => Number(s.juniorCreatorUser) === uid && String(s.status) !== "voided",
      );

      let lifetimeMinutes = 0;
      let activeNow = false;
      for (const shift of userShifts) {
        if (shift.status === "completed") {
          lifetimeMinutes += Number(shift.totalMinutes ?? 0);
        } else if (shift.status === "active") {
          activeNow = true;
          lifetimeMinutes += minutesBetween(new Date(shift.startedAt as string), now);
        }
      }

      const leadsThisWeek = userLeads.filter((l) => {
        const created = new Date(l.createdAt as string);
        return created >= weekStart;
      }).length;

      return {
        id: uid,
        displayName: String(user.displayName ?? "—"),
        leadsSubmitted: userLeads.length,
        leadsThisWeek,
        hoursWorkedMinutes: lifetimeMinutes,
        hoursLabel: fmtHours(lifetimeMinutes),
        rankTitle: getRankTitle(userLeads.length),
        activeNow,
      };
    })
    .sort((a, b) => b.leadsSubmitted - a.leadsSubmitted);

  const juniorActivityCount =
    teamActivity.filter((t) => t.activeNow).length +
    teamActivity.reduce((s, t) => s + t.leadsThisWeek, 0);

  const stalledCampaigns = campaignHealth.filter((c) => c.score < 60);

  // Snapshot metrics
  const snapshot: FounderSnapshotMetric[] = [
    {
      id: "active-clients",
      label: "Active Clients",
      value: String(activeClients.length),
      sub: `${retainerClientIds.size} on retainer`,
      href: "/admin/collections/clients",
    },
    {
      id: "mrr",
      label: "Monthly Recurring Revenue",
      value: fmtMoneyCompact(mrr),
      sub: `${fmtMoneyCompact(mrr * 12)} ARR`,
      href: "/admin/collections/retainers",
    },
    {
      id: "projects",
      label: "Projects In Progress",
      value: String(activeProjects.length),
      sub: "Planning through review",
      href: "/admin/collections/client-projects",
    },
    {
      id: "requests",
      label: "Open Client Requests",
      value: String(openRequests.length),
      sub: overdueRequests.length > 0 ? `${overdueRequests.length} overdue` : "None overdue",
      href: "/admin/collections/client-requests",
      alert: overdueRequests.length > 0,
    },
    {
      id: "audits",
      label: "New Website Audits",
      value: String(newAudits30d.length),
      sub: `${audits.length} total in system`,
      href: "/admin/operations/audits",
    },
    {
      id: "research-leads",
      label: "New Research Leads",
      value: String(newResearchLeads30d.length),
      sub: `${researchLeads.length} lifetime`,
      href: "/admin/operations/research",
    },
    {
      id: "junior-activity",
      label: "Junior Creator Activity",
      value: String(juniorActivityCount),
      sub: `${teamActivity.filter((t) => t.activeNow).length} active now · ${teamActivity.reduce((s, t) => s + t.leadsThisWeek, 0)} leads this week`,
      href: "/admin/operations/junior-creators",
    },
    {
      id: "onboarding",
      label: "New Onboarding Clients",
      value: String(onboardingOpen.length),
      sub: `${onboardingWaitingKxd.length} waiting on KXD`,
      href: "/admin/operations/onboarding",
      alert: onboardingWaitingKxd.length > 0,
    },
  ];

  // Today's focus — priority stack
  const todaysFocus: FounderFocusItem[] = [];

  for (const r of overdueRequests.slice(0, 3)) {
    const days = Math.abs(daysUntil(r.dueDate as string) ?? 0);
    todaysFocus.push({
      id: `overdue-req-${r.id}`,
      label: String(r.requestTitle || "Overdue client request"),
      detail: `${clientName(r.client)} · Overdue ${days} day${days !== 1 ? "s" : ""}`,
      urgency: "critical",
      href: `/admin/collections/client-requests/${r.id}`,
    });
  }

  for (const a of allScores.filter((x) => x.status === "at-risk").slice(0, 2)) {
    todaysFocus.push({
      id: `at-risk-${a.clientId}`,
      label: `${a.name} — client at risk`,
      detail: `${fmtMoney(a.mrr)}/mo · ${a.flags.join(" · ") || "Relationship needs attention"}`,
      urgency: "critical",
      href: `/admin/collections/clients/${a.clientId}`,
    });
  }

  for (const o of onboardingWaitingKxd.slice(0, 2)) {
    todaysFocus.push({
      id: `onboarding-${o.id}`,
      label: `${clientName(o.client)} — onboarding waiting on KXD`,
      detail: "Client onboarding needs studio action",
      urgency: "high",
      href: `/admin/operations/onboarding`,
    });
  }

  for (const r of openRequests.filter((x) => x.priority === "urgent" || x.priority === "high").slice(0, 2)) {
    if (todaysFocus.some((f) => f.id === `overdue-req-${r.id}`)) continue;
    todaysFocus.push({
      id: `pending-req-${r.id}`,
      label: String(r.requestTitle || "Pending client request"),
      detail: `${clientName(r.client)} · ${String(r.priority)} priority`,
      urgency: "high",
      href: `/admin/collections/client-requests/${r.id}`,
    });
  }

  for (const c of stalledCampaigns.slice(0, 2)) {
    todaysFocus.push({
      id: `stalled-campaign-${c.campaignId}`,
      label: `${c.title} — creative campaign needs attention`,
      detail: `Health score ${c.score}/100 · stalled deliverables detected`,
      urgency: "medium",
      href: `/admin/operations/creative`,
    });
  }

  for (const a of allScores.filter((x) => {
    const d = daysUntil(x.renewalDate);
    return d !== null && d >= 0 && d <= 14;
  }).slice(0, 2)) {
    const d = daysUntil(a.renewalDate) ?? 0;
    todaysFocus.push({
      id: `renewal-${a.clientId}`,
      label: `${a.name} — renewal in ${d} day${d !== 1 ? "s" : ""}`,
      detail: `${fmtMoney(a.mrr)}/mo retainer`,
      urgency: "high",
      href: `/admin/collections/clients/${a.clientId}`,
    });
  }

  const urgencyOrder = { critical: 0, high: 1, medium: 2 };
  todaysFocus.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return {
    dateDisplay,
    timeDisplay,
    snapshot,
    todaysFocus: todaysFocus.slice(0, 8),
    growthPipeline: {
      auditsSubmitted: audits.length,
      auditsNew30d: newAudits30d.length,
      researchLeadsSubmitted: researchLeads.length,
      researchLeadsNew30d: newResearchLeads30d.length,
      qualifiedOpportunities: qualifiedLeads.length,
      closedOpportunities: closedLeads.length,
    },
    teamActivity,
    clientHealth: {
      healthy: healthyCount,
      needsAttention: needsAttentionCount,
      atRisk: atRiskCount,
      topClients,
    },
    revenue: {
      mrr,
      arr: mrr * 12,
      activeRetainers: activeRetainers.length,
      retainerClients: retainerClientIds.size,
      topAccounts,
    },
    founderNotes: FOUNDER_NOTES,
  };
}
