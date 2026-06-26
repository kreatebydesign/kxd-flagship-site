import "server-only";

import {
  ACTIVE_PROJECT_STATUSES,
  STALE_PROJECT_DAYS,
  STALE_TIMELINE_DAYS,
  activeClients,
  clientId,
  clientName,
  daysSince,
  daysUntil,
  fmtMoney,
  latestActivityDate,
  retainerClientIds,
} from "@/lib/intelligence/context";
import type { FounderInsightsBundle } from "@/lib/intelligence/types";
import type { ReportingDashboardData } from "@/lib/reporting/types";
import type { ReminderItem } from "@/lib/executive-notes/types";
import type { AutomationDashboardData } from "@/lib/automation/types";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import type { BrainSignal } from "./types";

function signal(
  item: Omit<BrainSignal, "id" | "estimatedValue"> & { id?: string; estimatedValue?: number | null },
): BrainSignal {
  return { estimatedValue: null, ...item, id: item.id ?? `sig-${item.kind}-${item.clientId ?? item.title}` };
}

export function buildBrainSignals(input: {
  ctx: IntelligenceContext;
  founder: FounderInsightsBundle;
  reporting: ReportingDashboardData | null;
  automation: AutomationDashboardData | null;
  overdueReminders: ReminderItem[];
}): BrainSignal[] {
  const { ctx, founder, reporting, automation, overdueReminders } = input;
  const signals: BrainSignal[] = [];
  const retainerIds = retainerClientIds(ctx);

  for (const risk of founder.relationship.risks) {
    signals.push(
      signal({
        kind: "relationship-risk",
        title: `${risk.clientName} relationship attention`,
        reason: risk.signals.join(" · "),
        urgency: risk.urgency,
        confidence: "high",
        estimatedValue: null,
        suggestedAction: "Review client command center and schedule follow-up.",
        relatedModule: "Timeline",
        clientId: risk.clientId,
        clientName: risk.clientName,
        href: risk.href,
      }),
    );
  }

  for (const client of activeClients(ctx)) {
    const cid = client.id as number;
    const name = String(client.name);

    if (!retainerIds.has(cid)) {
      signals.push(
        signal({
          kind: "retainer-opportunity",
          title: `${name} — no active retainer`,
          reason: "Active client without retainer agreement on file.",
          urgency: "high",
          confidence: "high",
          estimatedValue: 2500,
          suggestedAction: "Confirm engagement model and create retainer record.",
          relatedModule: "Accounts",
          clientId: cid,
          clientName: name,
          href: `/admin/operations/client-command/${cid}`,
        }),
      );
    }

    const last = latestActivityDate(ctx, cid);
    if ((daysSince(last) ?? 0) > STALE_TIMELINE_DAYS) {
      signals.push(
        signal({
          kind: "relationship-risk",
          title: `${name} — relationship inactive`,
          reason: `No timeline activity in ${daysSince(last)} days.`,
          urgency: "medium",
          confidence: "high",
          suggestedAction: "Log executive note or schedule check-in.",
          relatedModule: "Strategy Vault",
          clientId: cid,
          clientName: name,
          href: `/admin/operations/timeline/${cid}`,
        }),
      );
    }

    const profile = ctx.executiveProfiles.find((p) => clientId(p.client) === cid);
    const expansion = profile?.potentialMonthlyRevenue;
    if (expansion && Number(expansion) > 0) {
      signals.push(
        signal({
          kind: "growth-opportunity",
          title: `${name} expansion potential`,
          reason: `Profile shows ${fmtMoney(Number(expansion))}/mo expansion opportunity.`,
          urgency: "medium",
          confidence: "medium",
          estimatedValue: Number(expansion),
          suggestedAction: "Prepare growth proposal or strategy note.",
          relatedModule: "Sales",
          clientId: cid,
          clientName: name,
          href: `/admin/sales/proposals/new?client=${cid}`,
        }),
      );
    }
  }

  for (const infra of founder.infrastructure) {
    signals.push(
      signal({
        kind: "infrastructure-risk",
        title: infra.title,
        reason: infra.detail,
        urgency: infra.urgency,
        confidence: "high",
        estimatedValue: null,
        suggestedAction: "Review infrastructure command screen.",
        relatedModule: "Infrastructure",
        clientId: infra.clientId,
        clientName: infra.clientName,
        href: infra.href,
      }),
    );
  }

  for (const p of ctx.proposals.filter((pr) => ["sent", "viewed"].includes(String(pr.status)))) {
    const sentDays = daysSince(p.sentAt as string ?? p.updatedAt as string);
    if ((sentDays ?? 0) > 14) {
      signals.push(
        signal({
          kind: "proposal-stalled",
          title: `Proposal stalled — ${clientName(p.client, ctx)}`,
          reason: `Proposal in ${String(p.status)} for ${sentDays} days.`,
          urgency: "high",
          confidence: "medium",
          estimatedValue: Number(p.monthlyAmount ?? p.totalAmount ?? 0) || null,
          suggestedAction: "Follow up or revise proposal terms.",
          relatedModule: "Sales",
          clientId: clientId(p.client),
          clientName: clientName(p.client, ctx),
          href: `/admin/sales/proposals/${p.id}`,
        }),
      );
    }
  }

  if (reporting && reporting.reportsDue > 0) {
    signals.push(
      signal({
        kind: "reporting-due",
        title: `${reporting.reportsDue} monthly report${reporting.reportsDue === 1 ? "" : "s"} due`,
        reason: "Active clients without a report for the current period.",
        urgency: reporting.reportsDue >= 3 ? "high" : "medium",
        confidence: "high",
        estimatedValue: null,
        suggestedAction: "Generate reports from the Reporting Engine.",
        relatedModule: "Reporting",
        href: "/admin/operations/reports",
      }),
    );
  }

  for (const r of overdueReminders) {
    signals.push(
      signal({
        kind: "strategy-reminder",
        title: r.title,
        reason: `Reminder overdue for ${r.clientName}.`,
        urgency: "high",
        confidence: "high",
        estimatedValue: null,
        suggestedAction: "Complete follow-up or reschedule reminder.",
        relatedModule: "Strategy Vault",
        clientId: r.clientId,
        clientName: r.clientName,
        href: r.href,
      }),
    );
  }

  if (automation && automation.stats.failedEvents > 0) {
    signals.push(
      signal({
        kind: "automation-failure",
        title: `${automation.stats.failedEvents} automation failure${automation.stats.failedEvents === 1 ? "" : "s"}`,
        reason: "Automation events failed during recent processing.",
        urgency: automation.systemStatus === "degraded" ? "critical" : "high",
        confidence: "high",
        estimatedValue: null,
        suggestedAction: "Review automation dashboard failures.",
        relatedModule: "Automation",
        href: "/admin/operations/automation",
      }),
    );
  }

  for (const project of ctx.projects.filter((p) => ACTIVE_PROJECT_STATUSES.has(String(p.status)))) {
    if ((daysSince(project.updatedAt as string) ?? 0) > STALE_PROJECT_DAYS) {
      signals.push(
        signal({
          kind: "delivery-risk",
          title: `Project stalled — ${String(project.projectName ?? project.title)}`,
          reason: `No update in ${daysSince(project.updatedAt as string)} days.`,
          urgency: "medium",
          confidence: "high",
          estimatedValue: null,
          suggestedAction: "Review project status and unblock delivery.",
          relatedModule: "Projects",
          clientId: clientId(project.client),
          clientName: clientName(project.client, ctx),
          href: `/admin/collections/client-projects/${project.id}`,
        }),
      );
    }
  }

  for (const audit of ctx.audits) {
    if ((daysSince(audit.completedAt as string ?? audit.createdAt as string) ?? 0) > 180) {
      const cid = clientId(audit.client);
      signals.push(
        signal({
          kind: "seo-opportunity",
          title: `Website audit stale — ${audit.company ?? clientName(audit.client, ctx)}`,
          reason: "Audit older than 6 months — refresh recommended.",
          urgency: "low",
          confidence: "medium",
          estimatedValue: null,
          suggestedAction: "Run new website audit.",
          relatedModule: "Audits",
          clientId: cid,
          clientName: String(audit.company ?? clientName(audit.client, ctx)),
          href: "/admin/operations/audits",
        }),
      );
    }
  }

  if (founder.revenue.missingRetainerCount > 0) {
    signals.push(
      signal({
        kind: "revenue-risk",
        title: `${founder.revenue.missingRetainerCount} clients without retainers`,
        reason: `MRR gap estimated at ${fmtMoney(founder.revenue.potentialExpansionRevenue)}/mo potential.`,
        urgency: "high",
        confidence: "high",
        estimatedValue: founder.revenue.potentialExpansionRevenue,
        suggestedAction: "Review accounts and confirm billing structure.",
        relatedModule: "Accounts",
        href: "/admin/operations/accounts",
      }),
    );
  }

  signals.sort(
    (a, b) =>
      ({ critical: 0, high: 1, medium: 2, low: 3 }[a.urgency] ?? 9) -
      ({ critical: 0, high: 1, medium: 2, low: 3 }[b.urgency] ?? 9),
  );

  return signals;
}
