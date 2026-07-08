import type { IntelligenceConfidence, IntelligenceUrgency } from "../types";
import { clientId, clientName, daysSince } from "../context";
import type { BriefingInputContext, BriefingPriority } from "./types";

const MAX_PRIORITIES = 5;

const URGENCY_WEIGHT: Record<IntelligenceUrgency, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const CONFIDENCE_WEIGHT: Record<IntelligenceConfidence, number> = {
  high: 1,
  medium: 0.85,
  low: 0.65,
};

function rankScore(
  businessImpact: number,
  urgency: IntelligenceUrgency,
  confidence: IntelligenceConfidence,
): number {
  return businessImpact * URGENCY_WEIGHT[urgency] * CONFIDENCE_WEIGHT[confidence];
}

function pushPriority(list: BriefingPriority[], item: Omit<BriefingPriority, "id"> & { id?: string }): void {
  list.push({ ...item, id: item.id ?? `priority-${item.title}` });
}

export function buildTopPriorities(input: BriefingInputContext): BriefingPriority[] {
  const { work, reviewInbox, communications, intelligence } = input;
  const priorities: BriefingPriority[] = [];

  for (const item of work.currentWork) {
    if (item.status !== "blocked" && item.priority !== "critical" && item.priority !== "high") continue;

    pushPriority(priorities, {
      id: `work-${item.id}`,
      title: item.status === "blocked" ? `Unblock · ${item.title}` : item.title,
      reason:
        item.status === "blocked"
          ? `${item.clientName} work is blocked and cannot progress.`
          : `${item.priority} priority work for ${item.clientName}.`,
      businessImpact: item.status === "blocked" ? 90 : item.priority === "critical" ? 85 : 70,
      urgency: item.status === "blocked" ? "critical" : item.priority === "critical" ? "critical" : "high",
      confidence: "high",
      clientName: item.clientName,
      href: item.adminHref,
      supportingSignals: [`work:${item.id}`, `status:${item.status}`],
    });
  }

  if (reviewInbox.newCount > 0) {
    pushPriority(priorities, {
      id: "review-inbox-new",
      title: `Triage ${reviewInbox.newCount} new website review${reviewInbox.newCount === 1 ? "" : "s"}`,
      reason: "Untriaged client revisions delay studio response and erode trust.",
      businessImpact: reviewInbox.newCount >= 3 ? 82 : 68,
      urgency: reviewInbox.newCount >= 3 ? "high" : "medium",
      confidence: "high",
      href: "/admin/operations/review-inbox",
      supportingSignals: [`website-review:new:${reviewInbox.newCount}`],
    });
  }

  if (communications.needsReplyCount > 0) {
    pushPriority(priorities, {
      id: "comms-needs-reply",
      title: `Reply to ${communications.needsReplyCount} client thread${communications.needsReplyCount === 1 ? "" : "s"}`,
      reason: "Outstanding replies signal neglect and slow decision-making.",
      businessImpact: communications.needsReplyCount >= 3 ? 78 : 62,
      urgency: communications.needsReplyCount >= 3 ? "high" : "medium",
      confidence: "high",
      href: "/admin/operations/command",
      supportingSignals: [`communications:needs_reply:${communications.needsReplyCount}`],
    });
  }

  for (const item of work.waitingOnClient.slice(0, 3)) {
    if (item.priority !== "critical" && item.priority !== "high") continue;
    pushPriority(priorities, {
      id: `waiting-${item.id}`,
      title: `Follow up · ${item.title}`,
      reason: `${item.clientName} input is blocking ${item.priority} priority work.`,
      businessImpact: 58,
      urgency: "medium",
      confidence: "high",
      clientName: item.clientName,
      href: item.adminHref,
      supportingSignals: [`work:waiting:${item.id}`],
    });
  }

  for (const req of intelligence.requests) {
    if (String(req.status ?? "") !== "new") continue;
    if (String(req.experienceModule ?? "") === "website-review") continue;

    const cid = clientId(req.client);
    pushPriority(priorities, {
      id: `request-${req.id}`,
      title: `Triage request · ${String(req.requestTitle ?? "Client request")}`,
      reason: `${clientName(req.client, intelligence)} request awaiting operator review.`,
      businessImpact: 55,
      urgency: "medium",
      confidence: "high",
      clientName: clientName(req.client, intelligence),
      href: cid ? `/admin/operations/client-command/${cid}` : undefined,
      supportingSignals: [`client-request:${req.id}`],
    });
  }

  for (const item of work.review.slice(0, 2)) {
    pushPriority(priorities, {
      id: `review-work-${item.id}`,
      title: `Review · ${item.title}`,
      reason: `Work in review for ${item.clientName} — decision needed to advance delivery.`,
      businessImpact: 60,
      urgency: "medium",
      confidence: "high",
      clientName: item.clientName,
      href: item.adminHref,
      supportingSignals: [`work:review:${item.id}`],
    });
  }

  for (const item of work.currentWork) {
    if (!item.dueDate) continue;
    const overdue = daysSince(item.dueDate);
    if (overdue == null || overdue <= 0) continue;

    pushPriority(priorities, {
      id: `overdue-${item.id}`,
      title: `Overdue · ${item.title}`,
      reason: `Due date passed ${overdue} day${overdue === 1 ? "" : "s"} ago for ${item.clientName}.`,
      businessImpact: 75,
      urgency: overdue > 3 ? "high" : "medium",
      confidence: "high",
      clientName: item.clientName,
      href: item.adminHref,
      supportingSignals: [`work:overdue:${item.id}`],
    });
  }

  const seen = new Set<string>();
  return priorities
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort(
      (a, b) =>
        rankScore(b.businessImpact, b.urgency, b.confidence) -
        rankScore(a.businessImpact, a.urgency, a.confidence),
    )
    .slice(0, MAX_PRIORITIES);
}
