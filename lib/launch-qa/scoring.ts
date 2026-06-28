import { LAUNCH_QA_CATEGORIES } from "./templates";
import type {
  LaunchQaBlocker,
  LaunchQaCategorySummary,
  LaunchQaChecklistItem,
  LaunchQaItemStatus,
  LaunchQaScores,
  LaunchRecommendation,
  LaunchQaStatus,
} from "./types";

const PASS_STATUSES: LaunchQaItemStatus[] = ["pass", "na", "skip"];

export function isItemComplete(item: LaunchQaChecklistItem): boolean {
  return PASS_STATUSES.includes(item.status);
}

export function isItemFailed(item: LaunchQaChecklistItem): boolean {
  return item.status === "fail";
}

export function computeLaunchQaScores(items: LaunchQaChecklistItem[]): LaunchQaScores {
  let requiredTotal = 0;
  let completedRequired = 0;
  let optionalTotal = 0;
  let completedOptional = 0;
  let criticalBlockerCount = 0;
  let warningCount = 0;

  for (const item of items) {
    if (item.required) {
      requiredTotal += 1;
      if (isItemComplete(item)) completedRequired += 1;
    } else {
      optionalTotal += 1;
      if (isItemComplete(item)) completedOptional += 1;
    }

    if (isItemFailed(item)) {
      if (item.severity === "critical") criticalBlockerCount += 1;
      else warningCount += 1;
    }
  }

  const requiredPct = requiredTotal ? completedRequired / requiredTotal : 1;
  const optionalPct = optionalTotal ? completedOptional / optionalTotal : 1;
  let readinessScore = Math.round(requiredPct * 85 + optionalPct * 15);
  if (criticalBlockerCount > 0) readinessScore = Math.min(readinessScore, 59);
  readinessScore = Math.max(0, Math.min(100, readinessScore));

  let recommendation: LaunchRecommendation = "not-ready";
  if (criticalBlockerCount > 0) {
    recommendation = "not-ready";
  } else if (completedRequired < requiredTotal) {
    recommendation = readinessScore >= 70 ? "needs-review" : "not-ready";
  } else if (warningCount > 0) {
    recommendation = "needs-review";
  } else if (readinessScore >= 90) {
    recommendation = "ready-to-launch";
  } else {
    recommendation = "needs-review";
  }

  return {
    readinessScore,
    criticalBlockerCount,
    warningCount,
    completedRequired,
    requiredTotal,
    completedOptional,
    optionalTotal,
    recommendation,
  };
}

export function computeCategorySummaries(items: LaunchQaChecklistItem[]): LaunchQaCategorySummary[] {
  return LAUNCH_QA_CATEGORIES.map((cat) => {
    const catItems = items.filter((i) => i.categoryId === cat.id);
    const requiredItems = catItems.filter((i) => i.required);
    return {
      id: cat.id,
      label: cat.label,
      completed: catItems.filter(isItemComplete).length,
      total: catItems.length,
      requiredComplete: requiredItems.filter(isItemComplete).length,
      requiredTotal: requiredItems.length,
    };
  });
}

export function extractBlockers(items: LaunchQaChecklistItem[]): LaunchQaBlocker[] {
  return items
    .filter((i) => isItemFailed(i) && i.severity === "critical")
    .map((i) => ({ itemId: i.id, title: i.title, severity: i.severity }));
}

export function extractWarnings(items: LaunchQaChecklistItem[]): LaunchQaBlocker[] {
  return items
    .filter((i) => isItemFailed(i) && i.severity !== "critical")
    .map((i) => ({ itemId: i.id, title: i.title, severity: i.severity }));
}

export function deriveSessionStatus(
  scores: LaunchQaScores,
  currentStatus: LaunchQaStatus,
  approvedAt?: string | null,
): LaunchQaStatus {
  if (currentStatus === "launched" || currentStatus === "archived") return currentStatus;
  if (approvedAt) return "approved";
  if (scores.criticalBlockerCount > 0) return "blocked";
  if (scores.recommendation === "ready-to-launch" && scores.completedRequired === scores.requiredTotal) {
    return "ready";
  }
  if (scores.completedRequired > 0 || scores.completedOptional > 0) return "in-progress";
  return currentStatus === "draft" ? "draft" : "in-progress";
}

export function recommendationLabel(rec: LaunchRecommendation): string {
  switch (rec) {
    case "not-ready":
      return "Not Ready";
    case "needs-review":
      return "Needs Review";
    case "ready-to-launch":
      return "Ready to Launch";
    case "approved":
      return "Approved";
    default:
      return rec;
  }
}
