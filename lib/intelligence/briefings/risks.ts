import { clientId, clientName, daysSince, STALE_TIMELINE_DAYS } from "../context";
import type { BriefingInputContext, BriefingRisk } from "./types";

const MAX_RISKS = 3;

function pushRisk(list: BriefingRisk[], item: Omit<BriefingRisk, "id"> & { id?: string }): void {
  list.push({ ...item, id: item.id ?? `risk-${item.title}` });
}

export function buildBusinessRisks(input: BriefingInputContext): BriefingRisk[] {
  const { work, reviewInbox, communications, intelligence } = input;
  const risks: BriefingRisk[] = [];

  if (work.stats.openCount > 25) {
    pushRisk(risks, {
      id: "risk-work-backlog",
      title: "Large work backlog",
      reason: `${work.stats.openCount} open work items may delay client delivery and erode confidence.`,
      urgency: work.stats.openCount > 40 ? "high" : "medium",
      confidence: "high",
      href: "/admin/operations/work",
      supportingSignals: [`work:open:${work.stats.openCount}`],
    });
  }

  if (work.stats.blockedCount >= 2) {
    pushRisk(risks, {
      id: "risk-blocked-work",
      title: "Multiple blocked work items",
      reason: `${work.stats.blockedCount} items are blocked — execution is stalling across clients.`,
      urgency: "high",
      confidence: "high",
      href: "/admin/operations/work",
      supportingSignals: work.currentWork
        .filter((item) => item.status === "blocked")
        .map((item) => `work:blocked:${item.id}`),
    });
  }

  const silentClients = intelligence.clients.filter((client) => {
    if (String(client.status ?? "active") !== "active") return false;
    const cid = clientId(client);
    if (cid == null) return false;

    const clientEvents = intelligence.executiveTimeline.filter(
      (event) => clientId(event.client) === cid,
    );
    if (clientEvents.length === 0) return true;

    const latest = clientEvents.reduce((max, event) => {
      const at = new Date(String(event.occurredAt ?? event.createdAt ?? "")).getTime();
      return at > max ? at : max;
    }, 0);

    const days = Math.floor((Date.now() - latest) / 86_400_000);
    return days > STALE_TIMELINE_DAYS;
  });

  if (silentClients.length > 0) {
    pushRisk(risks, {
      id: "risk-client-silence",
      title: "Long client silence",
      reason: `${silentClients.length} active client${silentClients.length === 1 ? "" : "s"} with no timeline activity in ${STALE_TIMELINE_DAYS}+ days.`,
      urgency: silentClients.length >= 2 ? "high" : "medium",
      confidence: "high",
      href: "/admin/operations/timeline",
      supportingSignals: silentClients.map((c) => `timeline:silent:${c.id}`),
    });
  }

  if (reviewInbox.newCount >= 3) {
    pushRisk(risks, {
      id: "risk-review-volume",
      title: "Increasing review volume",
      reason: `${reviewInbox.newCount} untriaged website reviews — response lag risks revision fatigue.`,
      urgency: "high",
      confidence: "high",
      href: "/admin/operations/review-inbox",
      supportingSignals: [`website-review:new:${reviewInbox.newCount}`],
    });
  }

  const overdueWork = work.currentWork.filter((item) => {
    if (!item.dueDate) return false;
    const days = daysSince(item.dueDate);
    return days != null && days > 0;
  });

  if (overdueWork.length >= 2) {
    pushRisk(risks, {
      id: "risk-missed-due-dates",
      title: "Missed due dates",
      reason: `${overdueWork.length} work items are past due — commitments may be at risk.`,
      urgency: "high",
      confidence: "high",
      href: "/admin/operations/work",
      supportingSignals: overdueWork.map((item) => `work:overdue:${item.id}`),
    });
  }

  const reviewsByClient = new Map<number, number>();
  for (const req of intelligence.requests) {
    if (String(req.experienceModule ?? "") !== "website-review") continue;
    if (!["new", "triaged", "in-progress"].includes(String(req.status ?? ""))) continue;
    const cid = clientId(req.client);
    if (cid == null) continue;
    reviewsByClient.set(cid, (reviewsByClient.get(cid) ?? 0) + 1);
  }

  const repeatedRevisions = [...reviewsByClient.entries()].filter(([, count]) => count >= 3);
  if (repeatedRevisions.length > 0) {
    const [cid, count] = repeatedRevisions[0]!;
    pushRisk(risks, {
      id: `risk-repeated-revisions-${cid}`,
      title: "Repeated revisions",
      reason: `${clientName(cid, intelligence)} has ${count} open website reviews — scope or alignment may need attention.`,
      urgency: "medium",
      confidence: "high",
      clientName: clientName(cid, intelligence),
      href: `/admin/operations/review-inbox`,
      supportingSignals: [`website-review:client:${cid}:${count}`],
    });
  }

  if (communications.staleUnresolvedCount >= 2) {
    pushRisk(risks, {
      id: "risk-stale-comms",
      title: "Stale client threads",
      reason: `${communications.staleUnresolvedCount} unresolved communications aging beyond response window.`,
      urgency: "medium",
      confidence: "high",
      href: "/admin/operations/command",
      supportingSignals: [`communications:stale:${communications.staleUnresolvedCount}`],
    });
  }

  const urgencyRank = { critical: 0, high: 1, medium: 2, low: 3 };
  return risks
    .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency])
    .slice(0, MAX_RISKS);
}
