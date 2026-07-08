import type { IntelligenceConfidence } from "../types";
import type {
  BriefingActionType,
  BriefingInputContext,
  BriefingPriority,
  BriefingRecommendation,
  BriefingRisk,
  PlatformStatusSection,
} from "./types";

const MAX_RECOMMENDATIONS = 5;

function actionTypeFromPriority(priority: BriefingPriority): BriefingActionType {
  if (priority.id.startsWith("review-inbox")) return "review-inbox";
  if (priority.id.startsWith("comms")) return "respond";
  if (priority.id.startsWith("waiting")) return "follow-up";
  if (priority.id.startsWith("review-work")) return "review-work";
  if (priority.id.startsWith("overdue")) return "deliver";
  if (priority.title.toLowerCase().includes("unblock")) return "unblock";
  if (priority.id.startsWith("request")) return "operations";
  return "operations";
}

function actionTypeFromRisk(risk: BriefingRisk): BriefingActionType {
  if (risk.id.includes("review")) return "review-inbox";
  if (risk.id.includes("comms") || risk.id.includes("silence")) return "relationship";
  if (risk.id.includes("blocked") || risk.id.includes("backlog")) return "unblock";
  if (risk.id.includes("launch")) return "launch";
  return "operations";
}

function estimateValue(businessImpact: number): number | null {
  if (businessImpact >= 80) return 2500;
  if (businessImpact >= 65) return 1500;
  if (businessImpact >= 50) return 750;
  return null;
}

export function buildRecommendedActions(input: {
  priorities: BriefingPriority[];
  risks: BriefingRisk[];
}): BriefingRecommendation[] {
  const recommendations: BriefingRecommendation[] = [];

  for (const priority of input.priorities) {
    recommendations.push({
      id: `rec-from-${priority.id}`,
      title: priority.title,
      reason: priority.reason,
      businessImpact: priority.businessImpact,
      confidence: priority.confidence,
      actionType: actionTypeFromPriority(priority),
      supportingSignals: priority.supportingSignals,
      estimatedValue: estimateValue(priority.businessImpact),
      href: priority.href,
      clientName: priority.clientName,
    });
  }

  for (const risk of input.risks) {
    const duplicate = recommendations.some(
      (rec) => rec.title.toLowerCase() === risk.title.toLowerCase(),
    );
    if (duplicate) continue;

    recommendations.push({
      id: `rec-from-${risk.id}`,
      title: risk.title,
      reason: risk.reason,
      businessImpact: risk.urgency === "critical" ? 88 : risk.urgency === "high" ? 75 : 58,
      confidence: risk.confidence,
      actionType: actionTypeFromRisk(risk),
      supportingSignals: risk.supportingSignals,
      estimatedValue: estimateValue(risk.urgency === "critical" ? 88 : 75),
      href: risk.href,
      clientName: risk.clientName,
    });
  }

  const seen = new Set<string>();
  return recommendations
    .filter((rec) => {
      if (seen.has(rec.id)) return false;
      seen.add(rec.id);
      return true;
    })
    .sort((a, b) => b.businessImpact - a.businessImpact)
    .slice(0, MAX_RECOMMENDATIONS);
}

export function buildPlatformStatus(input: BriefingInputContext): PlatformStatusSection {
  const { work, reviewInbox, communications } = input;
  const items: PlatformStatusSection["items"] = [];

  items.push({
    label: "Work Engine",
    status:
      work.stats.blockedCount >= 2
        ? "warning"
        : work.stats.openCount > 30
          ? "attention"
          : "ok",
    detail:
      work.stats.blockedCount >= 2
        ? `${work.stats.blockedCount} blocked`
        : `${work.stats.openCount} open · ${work.stats.inProgressCount} in progress`,
  });

  items.push({
    label: "Review Inbox",
    status:
      reviewInbox.newCount >= 3
        ? "warning"
        : reviewInbox.newCount > 0
          ? "attention"
          : "ok",
    detail:
      reviewInbox.newCount > 0
        ? `${reviewInbox.newCount} new · ${reviewInbox.activeCount} active`
        : `${reviewInbox.activeCount} active revisions`,
  });

  items.push({
    label: "Communications",
    status:
      communications.needsReplyCount >= 3
        ? "warning"
        : communications.needsReplyCount > 0
          ? "attention"
          : "ok",
    detail:
      communications.needsReplyCount > 0
        ? `${communications.needsReplyCount} need reply`
        : "No outstanding replies",
  });

  items.push({
    label: "Timeline",
    status: "ok",
    detail: "Executive timeline active",
  });

  const warningCount = items.filter((item) => item.status === "warning").length;
  const attentionCount = items.filter((item) => item.status === "attention").length;

  let summary: string;
  if (warningCount > 0) {
    summary = `${warningCount} module${warningCount === 1 ? "" : "s"} require immediate attention.`;
  } else if (attentionCount > 0) {
    summary = `${attentionCount} module${attentionCount === 1 ? "" : "s"} need monitoring.`;
  } else {
    summary = "All core platform modules are operating normally.";
  }

  return { summary, items };
}

export function computeBriefingConfidence(input: BriefingInputContext): IntelligenceConfidence {
  const activeClients = input.intelligence.clients.filter(
    (c) => String(c.status ?? "active") === "active",
  ).length;

  if (activeClients === 0) return "low";

  const signalCount =
    input.work.stats.openCount +
    input.reviewInbox.activeCount +
    input.intelligence.executiveTimeline.length;

  if (signalCount >= 20 && activeClients >= 1) return "high";
  if (signalCount >= 5) return "medium";
  return "low";
}
