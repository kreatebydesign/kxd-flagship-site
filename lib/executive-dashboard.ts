/**
 * lib/executive-dashboard.ts
 * KXD OS Phase 6B — Executive dashboard aggregations
 * Read-only server-side aggregation from existing collections.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { calculateOnboardingReadiness,
  getOnboardingWorkflowStatus,
} from "@/lib/client-onboarding";
import { loadClientPrioritiesWidget } from "@/lib/client-command/actions/dashboard";
import type { ClientPrioritiesWidget } from "@/lib/client-command/actions/types";
import { loadExecutiveProposalsWidget } from "@/lib/executive-proposals/dashboard";
import type { ExecutiveProposalsWidget } from "@/lib/executive-proposals/client";
import { AUDIT_STATUS_LABEL } from "@/lib/website-audit/scoring";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export type ActionItem = {
  id: string;
  priority: number;
  label: string;
  detail: string;
  href: string;
  tone: "red" | "yellow" | "gold";
};

export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  sub: string;
  at: string;
  href: string;
};

export type ClientHealthFlag = {
  clientId: number;
  clientName: string;
  issues: string[];
  href: string;
};

export type CommandCenterCard = {
  id: string;
  title: string;
  value: string;
  sub?: string;
  href: string;
};

export type ProjectRiskItem = {
  id: string;
  projectName: string;
  clientName: string;
  reason: string;
  href: string;
};

export type RenewalItem = {
  id: number;
  clientName: string;
  label: string;
  date: string;
  amount: string;
  href: string;
};

export type OnboardingPipeline = {
  waitingOnClient: number;
  waitingOnKxd: number;
  readyForBuild: number;
  inPipeline: number;
};

export type ExecutiveDashboardData = {
  kpis: {
    totalClients: number;
    activeProjects: number;
    openRequests: number;
    pendingDeliverables: number;
    completedDeliverables30d: number;
    newAuditLeads30d: number;
    portalUsers: number;
    onboardingInProgress: number;
  };
  commandCenter: {
    cards: CommandCenterCard[];
    projectsAtRisk: ProjectRiskItem[];
    upcomingRenewals: RenewalItem[];
    onboardingPipeline: OnboardingPipeline;
    auditNewLeads: number;
    auditTotal: number;
  };
  actionCenter: ActionItem[];
  salesPipeline: {
    counts: Record<string, number>;
    total: number;
    conversionToWon: number;
    conversionToQualified: number;
  };
  clientHealth: ClientHealthFlag[];
  recentActivity: ActivityItem[];
  snapshot: {
    leadsThisMonth: number;
    newClientsThisMonth: number;
    projectsCompletedThisMonth: number;
    auditConversionRate: number;
    onboardingCompletionRate: number;
  };
  clientPriorities: ClientPrioritiesWidget;
  proposals: ExecutiveProposalsWidget;
};

function resolveClientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) return (raw as AnyDoc).id as number;
  return null;
}

function resolveClientName(raw: unknown): string {
  if (!raw) return "Unknown";
  if (typeof raw === "object" && raw !== null && "name" in raw) return String((raw as AnyDoc).name ?? "Unknown");
  return "Unknown";
}

function fmtShort(iso: string): string {
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

async function findAll(collection: string, limit = 500): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: collection as any,
    limit,
    depth: 1,
  });
  return result.docs as AnyDoc[];
}

export async function getExecutiveDashboardData(): Promise<ExecutiveDashboardData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const [clients, projects, requests, deliverables, audits, portalUsers, onboardings, retainers, clientPriorities, proposalsWidget] =
    await Promise.all([
      findAll("clients"),
      findAll("client-projects"),
      findAll("client-requests"),
      findAll("monthly-deliverables"),
      findAll("website-audits"),
      findAll("portal-users"),
      findAll("client-onboarding"),
      findAll("retainers"),
      loadClientPrioritiesWidget(),
      loadExecutiveProposalsWidget(),
    ]);

  const activeClients = clients.filter((c) => c.status !== "archived");
  const activeProjects = projects.filter((p) =>
    ["planning", "active", "waiting-on-client", "review"].includes(String(p.status)),
  );
  const openRequests = requests.filter(
    (r) => !["complete", "declined"].includes(String(r.status)),
  );
  const pendingDeliverables = deliverables.filter((d) => d.status !== "complete");
  const completedDeliverables30d = deliverables.filter((d) => {
    if (d.status !== "complete") return false;
    const completed = d.completedDate ?? d.updatedAt;
    if (!completed) return false;
    return new Date(completed as string) >= thirtyDaysAgo;
  });

  const newAuditLeads30d = audits.filter(
    (a) => new Date(a.createdAt as string) >= thirtyDaysAgo,
  );

  const onboardingInProgress = onboardings.filter((o) =>
    ["draft", "sent", "in-progress"].includes(String(o.status)),
  );

  const kpis = {
    totalClients: activeClients.length,
    activeProjects: activeProjects.length,
    openRequests: openRequests.length,
    pendingDeliverables: pendingDeliverables.length,
    completedDeliverables30d: completedDeliverables30d.length,
    newAuditLeads30d: newAuditLeads30d.length,
    portalUsers: portalUsers.length,
    onboardingInProgress: onboardingInProgress.length,
  };

  // ── Command center cards ────────────────────────────────────────────────────
  const activeRetainers = retainers.filter(
    (r) => r.billingStatus === "active" || r.billingStatus === "current",
  );
  const totalMRR = activeRetainers.reduce((s, r) => s + (Number(r.monthlyAmount) || 0), 0);
  const auditNewLeads = audits.filter((a) => a.status === "new-lead").length;

  let waitingOnClient = 0;
  let waitingOnKxd = 0;
  let readyForBuild = 0;
  for (const o of onboardings) {
    const workflow = getOnboardingWorkflowStatus(o);
    if (workflow === "waiting-on-client") waitingOnClient += 1;
    if (workflow === "waiting-on-kxd") waitingOnKxd += 1;
    if (workflow === "ready-for-build") readyForBuild += 1;
  }

  const commandCenterCards: CommandCenterCard[] = [
    {
      id: "active-clients",
      title: "Active Clients",
      value: String(activeClients.length),
      sub: "Non-archived accounts",
      href: "/admin/collections/clients",
    },
    {
      id: "mrr",
      title: "Monthly Retainers",
      value: totalMRR > 0 ? fmtMoney(totalMRR) : "$0",
      sub: `${activeRetainers.length} active retainers · MRR`,
      href: "/admin/collections/retainers",
    },
    {
      id: "open-requests",
      title: "Open Client Requests",
      value: String(openRequests.length),
      sub: "Awaiting action",
      href: "/admin/collections/client-requests",
    },
    {
      id: "active-projects",
      title: "Active Projects",
      value: String(activeProjects.length),
      sub: "Planning through review",
      href: "/admin/collections/client-projects",
    },
    {
      id: "projects-at-risk",
      title: "Projects At Risk",
      value: "—",
      sub: "See risk panel below",
      href: "/admin/collections/client-projects",
    },
    {
      id: "upcoming-renewals",
      title: "Upcoming Renewals",
      value: "—",
      sub: "60-day window",
      href: "/admin/collections/retainers",
    },
    {
      id: "audit-leads",
      title: "Website Audits / Leads",
      value: String(audits.length),
      sub: `${auditNewLeads} new leads`,
      href: "/admin/operations/audits",
    },
    {
      id: "onboarding-pipeline",
      title: "Onboarding Pipeline",
      value: String(onboardingInProgress.length),
      sub: `${waitingOnClient} waiting on client`,
      href: "/admin/operations/onboarding",
    },
  ];

  const projectsAtRisk: ProjectRiskItem[] = [];
  const riskProjectIds = new Set<string>();

  const openReqCountByClient: Record<number, number> = {};
  for (const r of openRequests) {
    const cid = resolveClientId(r.client);
    if (cid) openReqCountByClient[cid] = (openReqCountByClient[cid] ?? 0) + 1;
  }

  for (const p of projects) {
    if (!["planning", "active", "review", "waiting-on-client"].includes(String(p.status))) continue;
    const reasons: string[] = [];
    if (p.status === "waiting-on-client") reasons.push("Waiting on client");
    if (p.targetLaunchDate && new Date(p.targetLaunchDate as string) < now) {
      reasons.push("Past launch target");
    } else if (
      p.targetLaunchDate &&
      new Date(p.targetLaunchDate as string) <= in14Days &&
      new Date(p.targetLaunchDate as string) >= now
    ) {
      reasons.push("Launch within 14 days");
    }
    const cid = resolveClientId(p.client);
    const clientOpenReqs = cid ? (openReqCountByClient[cid] ?? 0) : 0;
    if (clientOpenReqs >= 2) reasons.push(`${clientOpenReqs} open requests`);

    if (reasons.length > 0) {
      const id = `proj-risk-${p.id}`;
      if (!riskProjectIds.has(id)) {
        riskProjectIds.add(id);
        projectsAtRisk.push({
          id,
          projectName: String(p.projectName ?? "Project"),
          clientName: resolveClientName(p.client),
          reason: reasons.join(" · "),
          href: `/admin/collections/client-projects/${p.id}`,
        });
      }
    }
  }

  projectsAtRisk.sort((a, b) => a.projectName.localeCompare(b.projectName));
  commandCenterCards[4].value = String(projectsAtRisk.length);

  const upcomingRenewalCandidates: Array<RenewalItem & { sortAt: number }> = [];
  for (const r of retainers) {
    const dateRaw = (r.renewalDate ?? r.nextInvoiceDate) as string | null | undefined;
    if (!dateRaw) continue;
    const d = new Date(dateRaw);
    if (d < now || d > in60Days) continue;
    upcomingRenewalCandidates.push({
      id: r.id as number,
      clientName: resolveClientName(r.client),
      label: String(r.retainerName ?? "Retainer"),
      date: fmtShort(dateRaw),
      amount: fmtMoney(r.monthlyAmount as number | null),
      href: `/admin/collections/retainers/${r.id}`,
      sortAt: d.getTime(),
    });
  }
  upcomingRenewalCandidates.sort((a, b) => a.sortAt - b.sortAt);
  const upcomingRenewals: RenewalItem[] = upcomingRenewalCandidates.map(({ sortAt: _, ...item }) => item);
  commandCenterCards[5].value = String(upcomingRenewals.length);

  // ── Action center ───────────────────────────────────────────────────────────
  const actionCenter: ActionItem[] = [];

  for (const d of deliverables) {
    if (d.status === "complete" || !d.dueDate) continue;
    if (new Date(d.dueDate as string) < now) {
      actionCenter.push({
        id: `del-overdue-${d.id}`,
        priority: 100,
        label: "Overdue Deliverable",
        detail: `${d.title as string} · ${resolveClientName(d.client)}`,
        href: `/admin/collections/monthly-deliverables/${d.id}`,
        tone: "red",
      });
    }
  }

  for (const r of requests) {
    if (r.status === "new") {
      actionCenter.push({
        id: `req-new-${r.id}`,
        priority: 85,
        label: "Unassigned Request",
        detail: `${r.requestTitle as string} · ${resolveClientName(r.client)}`,
        href: `/admin/collections/client-requests/${r.id}`,
        tone: "yellow",
      });
    }
  }

  for (const o of onboardings) {
    const readiness = calculateOnboardingReadiness(o);
    if (readiness.label !== "Ready") {
      actionCenter.push({
        id: `onb-${o.id}`,
        priority: readiness.label === "Missing Critical Items" ? 90 : 70,
        label: "Onboarding Needs Information",
        detail: `${o.businessName ?? resolveClientName(o.client)} · ${readiness.score}% · ${readiness.label}`,
        href: `/admin/collections/client-onboarding/${o.id}`,
        tone: readiness.label === "Missing Critical Items" ? "red" : "yellow",
      });
    }
  }

  for (const a of audits) {
    if (a.status === "new-lead") {
      actionCenter.push({
        id: `audit-${a.id}`,
        priority: 80,
        label: "New Audit Lead",
        detail: `${a.company || a.name} · Score ${a.overallScore} (${a.grade})`,
        href: `/admin/collections/website-audits/${a.id}`,
        tone: "gold",
      });
    }
  }

  for (const p of projects) {
    if (!p.targetLaunchDate) continue;
    const launch = new Date(p.targetLaunchDate as string);
    if (
      launch <= in14Days &&
      launch >= now &&
      ["planning", "active", "review", "waiting-on-client"].includes(String(p.status))
    ) {
      actionCenter.push({
        id: `proj-${p.id}`,
        priority: 75,
        label: "Project Near Deadline",
        detail: `${p.projectName as string} · Due ${fmtShort(p.targetLaunchDate as string)}`,
        href: `/admin/collections/client-projects/${p.id}`,
        tone: "yellow",
      });
    }
  }

  actionCenter.sort((a, b) => b.priority - a.priority);

  // ── Sales pipeline ──────────────────────────────────────────────────────────
  const pipelineStatuses = [
    "new-lead",
    "contacted",
    "qualified",
    "proposal-sent",
    "closed-won",
    "closed-lost",
  ];
  const counts: Record<string, number> = {};
  for (const s of pipelineStatuses) counts[s] = 0;
  for (const a of audits) {
    const s = String(a.status ?? "new-lead");
    if (counts[s] != null) counts[s] += 1;
    else counts["new-lead"] += 1;
  }
  const pipelineTotal = audits.length;
  const conversionToWon =
    pipelineTotal > 0 ? Math.round((counts["closed-won"] / pipelineTotal) * 100) : 0;
  const conversionToQualified =
    pipelineTotal > 0
      ? Math.round(
          ((counts.qualified + counts["proposal-sent"] + counts["closed-won"]) / pipelineTotal) * 100,
        )
      : 0;

  // ── Client health ─────────────────────────────────────────────────────────
  const clientHealth: ClientHealthFlag[] = [];
  const openRequestsByClient: Record<number, number> = {};
  for (const r of openRequests) {
    const cid = resolveClientId(r.client);
    if (cid) openRequestsByClient[cid] = (openRequestsByClient[cid] ?? 0) + 1;
  }

  const pendingDelByClient: Record<number, number> = {};
  for (const d of pendingDeliverables) {
    const cid = resolveClientId(d.client);
    if (cid) pendingDelByClient[cid] = (pendingDelByClient[cid] ?? 0) + 1;
  }

  const overdueDelByClient: Record<number, number> = {};
  for (const d of deliverables) {
    if (d.status === "complete" || !d.dueDate) continue;
    if (new Date(d.dueDate as string) < now) {
      const cid = resolveClientId(d.client);
      if (cid) overdueDelByClient[cid] = (overdueDelByClient[cid] ?? 0) + 1;
    }
  }

  const onboardingByClient: Record<number, AnyDoc> = {};
  for (const o of onboardings) {
    const cid = resolveClientId(o.client);
    if (cid) onboardingByClient[cid] = o;
  }

  const recentActivityByClient: Record<number, Date> = {};
  const touchClient = (raw: unknown, at: string) => {
    const cid = resolveClientId(raw);
    if (!cid) return;
    const d = new Date(at);
    if (!recentActivityByClient[cid] || d > recentActivityByClient[cid]) {
      recentActivityByClient[cid] = d;
    }
  };
  for (const r of requests) touchClient(r.client, r.updatedAt as string);
  for (const d of deliverables) touchClient(d.client, d.updatedAt as string);
  for (const p of projects) touchClient(p.client, p.updatedAt as string);

  for (const client of activeClients) {
    const cid = client.id as number;
    const issues: string[] = [];

    const lastAt = recentActivityByClient[cid];
    if (!lastAt || lastAt < thirtyDaysAgo) {
      issues.push("No recent activity (30 days)");
    }

    const onb = onboardingByClient[cid];
    if (onb) {
      const readiness = calculateOnboardingReadiness(onb);
      if (readiness.label !== "Ready" && String(onb.status) !== "approved") {
        issues.push(`Incomplete onboarding (${readiness.label})`);
      }
    } else if (
      client.osOnboardingReadinessLabel &&
      client.osOnboardingReadinessLabel !== "Ready"
    ) {
      issues.push(`Incomplete onboarding (${client.osOnboardingReadinessLabel})`);
    }

    if ((openRequestsByClient[cid] ?? 0) >= 3) {
      issues.push(`${openRequestsByClient[cid]} open requests`);
    }

    if ((overdueDelByClient[cid] ?? 0) > 0) {
      issues.push(`${overdueDelByClient[cid]} overdue deliverable(s)`);
    } else if ((pendingDelByClient[cid] ?? 0) >= 4) {
      issues.push(`${pendingDelByClient[cid]} pending deliverables`);
    }

    if (issues.length > 0) {
      clientHealth.push({
        clientId: cid,
        clientName: String(client.name ?? "Client"),
        issues,
        href: `/admin/collections/clients/${cid}`,
      });
    }
  }

  clientHealth.sort((a, b) => b.issues.length - a.issues.length);

  // ── Recent activity feed ──────────────────────────────────────────────────
  const recentActivity: ActivityItem[] = [];

  for (const r of requests) {
    recentActivity.push({
      id: `req-${r.id}`,
      type: "Request",
      title: String(r.requestTitle ?? "Request"),
      sub: `${resolveClientName(r.client)} · ${String(r.status)}`,
      at: r.createdAt as string,
      href: `/admin/collections/client-requests/${r.id}`,
    });
  }
  for (const d of deliverables) {
    recentActivity.push({
      id: `del-${d.id}`,
      type: "Deliverable",
      title: String(d.title ?? "Deliverable"),
      sub: `${resolveClientName(d.client)} · ${String(d.status)}`,
      at: d.updatedAt as string,
      href: `/admin/collections/monthly-deliverables/${d.id}`,
    });
  }
  for (const o of onboardings) {
    recentActivity.push({
      id: `onb-${o.id}`,
      type: "Onboarding",
      title: String(o.businessName ?? resolveClientName(o.client)),
      sub: String(o.status ?? "draft"),
      at: o.updatedAt as string,
      href: `/admin/collections/client-onboarding/${o.id}`,
    });
  }
  for (const a of audits) {
    recentActivity.push({
      id: `audit-${a.id}`,
      type: "Website Audit",
      title: String(a.company || a.name),
      sub: `Score ${a.overallScore} · ${AUDIT_STATUS_LABEL[String(a.status)] ?? a.status}`,
      at: a.createdAt as string,
      href: `/admin/collections/website-audits/${a.id}`,
    });
  }
  for (const u of portalUsers) {
    recentActivity.push({
      id: `portal-${u.id}`,
      type: "Portal Account",
      title: String(u.email ?? "Portal user"),
      sub: resolveClientName(u.client),
      at: u.createdAt as string,
      href: `/admin/collections/portal-users/${u.id}`,
    });
  }

  recentActivity.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const recentTop = recentActivity.slice(0, 20);

  // ── Business snapshot ─────────────────────────────────────────────────────
  const leadsThisMonth = audits.filter(
    (a) => new Date(a.createdAt as string) >= monthStart,
  ).length;

  const newClientsThisMonth = clients.filter(
    (c) => new Date(c.createdAt as string) >= monthStart,
  ).length;

  const projectsCompletedThisMonth = projects.filter((p) => {
    if (p.status !== "launched") return false;
    const at = p.targetLaunchDate ?? p.updatedAt;
    return at && new Date(at as string) >= monthStart;
  }).length;

  const auditConversionRate =
    audits.length > 0
      ? Math.round((counts["closed-won"] / audits.length) * 100)
      : 0;

  const approvedOnboarding = onboardings.filter((o) => o.status === "approved").length;
  const onboardingCompletionRate =
    onboardings.length > 0
      ? Math.round((approvedOnboarding / onboardings.length) * 100)
      : 0;

  return {
    kpis,
    commandCenter: {
      cards: commandCenterCards,
      projectsAtRisk: projectsAtRisk.slice(0, 8),
      upcomingRenewals: upcomingRenewals.slice(0, 8),
      onboardingPipeline: {
        waitingOnClient,
        waitingOnKxd,
        readyForBuild,
        inPipeline: onboardingInProgress.length,
      },
      auditNewLeads,
      auditTotal: audits.length,
    },
    actionCenter: actionCenter.slice(0, 12),
    salesPipeline: {
      counts,
      total: pipelineTotal,
      conversionToWon,
      conversionToQualified,
    },
    clientHealth: clientHealth.slice(0, 10),
    recentActivity: recentTop,
    snapshot: {
      leadsThisMonth,
      newClientsThisMonth,
      projectsCompletedThisMonth,
      auditConversionRate,
      onboardingCompletionRate,
    },
    clientPriorities,
    proposals: proposalsWidget,
  };
}
