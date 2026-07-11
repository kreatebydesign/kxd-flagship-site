import { clientId, clientName, daysSince } from "../context";
import type { BriefingInputContext, BriefingOpportunity } from "./types";

const MAX_OPPORTUNITIES = 3;

function pushOpportunity(
  list: BriefingOpportunity[],
  item: Omit<BriefingOpportunity, "id"> & { id?: string },
): void {
  list.push({ ...item, id: item.id ?? `opp-${item.title}` });
}

export function buildBusinessOpportunities(input: BriefingInputContext): BriefingOpportunity[] {
  const { work, reviewInbox, intelligence } = input;
  const opportunities: BriefingOpportunity[] = [];

  if (work.stats.completedTodayCount > 0) {
    pushOpportunity(opportunities, {
      id: "opp-completed-work",
      title: "Delivery momentum",
      reason: `${work.stats.completedTodayCount} work item${work.stats.completedTodayCount === 1 ? "" : "s"} completed today — strong execution signal.`,
      confidence: "high",
      href: "/admin/work",
      supportingSignals: work.completedToday.map((item) => `work:completed:${item.id}`),
    });
  }

  const recentTimeline = intelligence.executiveTimeline.filter((event) => {
    const days = daysSince(String(event.occurredAt ?? event.createdAt ?? ""));
    return days != null && days <= 7;
  });

  if (recentTimeline.length >= 3) {
    pushOpportunity(opportunities, {
      id: "opp-timeline-activity",
      title: "Strong client engagement",
      reason: `${recentTimeline.length} executive timeline events this week — relationships are active.`,
      confidence: "high",
      href: "/admin/operations/timeline",
      supportingSignals: recentTimeline.slice(0, 5).map((e) => `timeline:${e.id}`),
    });
  }

  if (work.stats.openCount > 0 && work.stats.openCount <= 8 && work.stats.blockedCount === 0) {
    pushOpportunity(opportunities, {
      id: "opp-low-backlog",
      title: "Low operational backlog",
      reason: `Only ${work.stats.openCount} open work items with no blockers — capacity available for growth work.`,
      confidence: "high",
      href: "/admin/work",
      supportingSignals: [`work:open:${work.stats.openCount}`],
    });
  }

  if (
    work.stats.completedTodayCount > work.stats.blockedCount &&
    work.stats.completedTodayCount >= 2
  ) {
    pushOpportunity(opportunities, {
      id: "opp-positive-momentum",
      title: "Positive delivery momentum",
      reason: "Completions are outpacing blockers — studio throughput is healthy.",
      confidence: "medium",
      href: "/admin/work",
      supportingSignals: [
        `work:completed_today:${work.stats.completedTodayCount}`,
        `work:blocked:${work.stats.blockedCount}`,
      ],
    });
  }

  const nearLaunch = intelligence.onboardings.filter((row) => {
    const status = String(row.status ?? "");
    return status === "ready-for-launch" || status === "launch-pending";
  });

  if (nearLaunch.length > 0) {
    const row = nearLaunch[0]!;
    const cid = clientId(row.client);
    pushOpportunity(opportunities, {
      id: `opp-launch-${row.id}`,
      title: "Launch readiness",
      reason: `${clientName(row.client, intelligence)} is approaching launch — coordinate final QA and handoff.`,
      confidence: "high",
      clientName: clientName(row.client, intelligence),
      href: cid ? `/admin/operations/launch-qa/${cid}` : "/admin/operations/launch-qa",
      supportingSignals: [`onboarding:launch:${row.id}`],
    });
  }

  if (reviewInbox.activeCount > 0 && reviewInbox.newCount === 0) {
    pushOpportunity(opportunities, {
      id: "opp-active-reviews",
      title: "Active client review participation",
      reason: "Clients are submitting revisions with no untriaged backlog — healthy collaboration loop.",
      confidence: "medium",
      href: "/admin/operations/review-inbox",
      supportingSignals: [`website-review:active:${reviewInbox.activeCount}`],
    });
  }

  const recentDeliverables = intelligence.deliverables.filter((d) => {
    const status = String(d.status ?? "");
    if (!["delivered", "complete"].includes(status)) return false;
    const days = daysSince(String(d.updatedAt ?? d.createdAt ?? ""));
    return days != null && days <= 14;
  });

  if (recentDeliverables.length > 0) {
    const d = recentDeliverables[0]!;
    pushOpportunity(opportunities, {
      id: `opp-deliverable-${d.id}`,
      title: "Recent deliverable completion",
      reason: `${clientName(d.client, intelligence)} received ${String(d.title ?? "a deliverable")} — good moment for relationship check-in.`,
      confidence: "high",
      clientName: clientName(d.client, intelligence),
      href: clientId(d.client)
        ? `/admin/operations/client-command/${clientId(d.client)}`
        : undefined,
      supportingSignals: [`deliverable:${d.id}`],
    });
  }

  return opportunities.slice(0, MAX_OPPORTUNITIES);
}
