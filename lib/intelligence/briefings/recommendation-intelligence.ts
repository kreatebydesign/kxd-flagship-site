import type { IntelligenceConfidence } from "../types";
import type { BrainMemoryRecord } from "@/lib/brain/types";
import { daysSince } from "../context";
import type {
  BriefingActionType,
  BriefingInputContext,
  BriefingRecommendation,
  BriefingSignalSource,
  IntelligentRecommendation,
  RecommendationCategory,
  RecommendationEffortLabel,
  RecommendationEvidence,
  RecommendationHistoryNote,
} from "./types";

function effortForAction(actionType: BriefingActionType): RecommendationEffortLabel {
  switch (actionType) {
    case "follow-up":
      return "5 minutes";
    case "respond":
    case "review-inbox":
    case "relationship":
    case "operations":
      return "15 minutes";
    case "review-work":
    case "unblock":
      return "30 minutes";
    case "deliver":
      return "1 hour";
    case "launch":
      return "Half day";
    default:
      return "15 minutes";
  }
}

function categoryForRecommendation(rec: BriefingRecommendation): RecommendationCategory {
  if (rec.actionType === "review-inbox" || rec.id.includes("review-inbox") || rec.id.includes("review")) {
    return "reviews";
  }
  if (rec.actionType === "relationship" || rec.id.includes("comms") || rec.id.includes("silence")) {
    return "relationship";
  }
  if (rec.actionType === "launch" || rec.id.includes("launch")) {
    return "projects";
  }
  if (rec.actionType === "deliver" || rec.id.includes("overdue") || rec.id.includes("deliverable")) {
    return "deliverables";
  }
  if (rec.actionType === "respond" || rec.id.includes("client-success")) {
    return "client-success";
  }
  if (rec.actionType === "review-work" || rec.id.includes("work")) {
    return "operations";
  }
  if (rec.title.toLowerCase().includes("website")) {
    return "website";
  }
  return "operations";
}

const EXPECTED_IMPACT: Record<BriefingActionType, string> = {
  "review-inbox": "Improves client response time and revision trust.",
  respond: "Strengthens relationship health and prevents silence.",
  unblock: "Prevents project delays and restores delivery flow.",
  "follow-up": "Unblocks waiting work and advances commitments.",
  deliver: "Meets delivery commitments and protects client confidence.",
  launch: "Reduces launch risk.",
  "review-work": "Advances work through the review gate.",
  relationship: "Strengthens relationship health.",
  operations: "Improves operational health across the portfolio.",
};

function expectedImpactFor(rec: BriefingRecommendation): string {
  if (rec.id.includes("risk-work-backlog")) {
    return "Reduces delivery pressure and protects client confidence.";
  }
  if (rec.id.includes("risk-missed-due-dates")) {
    return "Prevents project delays and missed commitments.";
  }
  if (rec.id.includes("risk-review-volume")) {
    return "Improves client response time on website revisions.";
  }
  if (rec.id.includes("risk-client-silence")) {
    return "Strengthens relationship health before engagement cools.";
  }
  if (rec.id.includes("blocked")) {
    return "Prevents project delays.";
  }
  return EXPECTED_IMPACT[rec.actionType];
}

function parseSignalKey(signal: string): { type: string; rest: string } {
  const colon = signal.indexOf(":");
  if (colon < 0) return { type: signal, rest: "" };
  return { type: signal.slice(0, colon), rest: signal.slice(colon + 1) };
}

function resolveEvidence(
  signal: string,
  context: BriefingInputContext,
  rec: BriefingRecommendation,
): RecommendationEvidence | null {
  const { type, rest } = parseSignalKey(signal);

  if (type === "work") {
    const parts = rest.split(":");
    const subType = parts[0];
    const idOrCount = parts[1];

    if (subType === "open" && idOrCount) {
      return {
        id: signal,
        source: "work",
        label: "Work backlog",
        detail: `${idOrCount} open work items in the Work Engine.`,
        href: "/admin/work",
      };
    }

    if (subType === "blocked" && idOrCount) {
      const workId = Number(idOrCount);
      const item = context.work.currentWork.find((w) => w.id === workId);
      return {
        id: signal,
        source: "work",
        label: item ? `Blocked · ${item.title}` : "Blocked work item",
        detail: item ? `${item.clientName} · ${item.status}` : undefined,
        href: item?.adminHref ?? "/admin/work",
      };
    }

    if (subType === "overdue" && idOrCount) {
      const workId = Number(idOrCount);
      const item = context.work.currentWork.find((w) => w.id === workId);
      return {
        id: signal,
        source: "work",
        label: item ? `Overdue · ${item.title}` : "Overdue work item",
        detail: item?.dueDate ? `Due date passed for ${item.clientName}.` : undefined,
        href: item?.adminHref ?? "/admin/work",
      };
    }

    if (subType === "waiting" && idOrCount) {
      const workId = Number(idOrCount);
      const item = context.work.waitingOnClient.find((w) => w.id === workId);
      return {
        id: signal,
        source: "work",
        label: item ? `Waiting · ${item.title}` : "Work waiting on client",
        detail: item ? `${item.clientName} input required.` : undefined,
        href: item?.adminHref,
      };
    }

    const workId = Number(rest);
    if (Number.isFinite(workId)) {
      const item =
        context.work.currentWork.find((w) => w.id === workId) ??
        context.work.recentWork.find((w) => w.id === workId);
      if (item) {
        return {
          id: signal,
          source: "work",
          label: item.title,
          detail: `${item.clientName} · ${item.status.replace(/-/g, " ")}`,
          href: item.adminHref,
        };
      }
    }
  }

  if (type === "website-review") {
    const parts = rest.split(":");
    if (parts[0] === "new" && parts[1]) {
      return {
        id: signal,
        source: "website-review",
        label: "Website Review inbox",
        detail: `${parts[1]} new revision${parts[1] === "1" ? "" : "s"} awaiting triage.`,
        href: "/admin/operations/review-inbox",
      };
    }
    if (parts[0] === "client" && parts[1]) {
      const count = parts[2];
      return {
        id: signal,
        source: "website-review",
        label: "Repeated revisions",
        detail: `${count ?? "Multiple"} open website reviews for one client.`,
        href: "/admin/operations/review-inbox",
      };
    }
  }

  if (type === "communications") {
    const parts = rest.split(":");
    if (parts[0] === "needs_reply" && parts[1]) {
      return {
        id: signal,
        source: "communications",
        label: "Needs reply",
        detail: `${parts[1]} client thread${parts[1] === "1" ? "" : "s"} awaiting studio response.`,
        href: "/admin/operations/command",
      };
    }
    if (parts[0] === "stale" && parts[1]) {
      return {
        id: signal,
        source: "communications",
        label: "Stale threads",
        detail: `${parts[1]} unresolved communication${parts[1] === "1" ? "" : "s"} aging beyond response window.`,
        href: "/admin/operations/command",
      };
    }
  }

  if (type === "timeline" && rest.startsWith("silent:")) {
    const clientIdStr = rest.replace("silent:", "");
    const client = context.intelligence.clientsById.get(Number(clientIdStr));
    return {
      id: signal,
      source: "timeline",
      label: "Client silence",
      detail: client
        ? `${String(client.name)} has no recent executive timeline activity.`
        : "Extended period without timeline activity.",
      href: client ? `/admin/operations/timeline/${clientIdStr}` : "/admin/operations/timeline",
    };
  }

  if (type === "client-request" && rest) {
    const req = context.intelligence.requests.find((r) => String(r.id) === rest);
    if (req) {
      return {
        id: signal,
        source: "client-requests",
        label: String(req.requestTitle ?? "Client request"),
        detail: `Status · ${String(req.status ?? "new")}`,
        href: rec.href,
      };
    }
  }

  if (type === "status" && rest) {
    return {
      id: signal,
      source: "work",
      label: "Work status",
      detail: `Current status · ${rest.replace(/-/g, " ")}`,
    };
  }

  return null;
}

function buildEvidence(
  rec: BriefingRecommendation,
  context: BriefingInputContext,
): RecommendationEvidence[] {
  const evidence: RecommendationEvidence[] = [];
  const seen = new Set<string>();

  for (const signal of rec.supportingSignals) {
    const item = resolveEvidence(signal, context, rec);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    evidence.push(item);
  }

  if (evidence.length === 0 && rec.reason) {
    evidence.push({
      id: `${rec.id}-reason`,
      source: categorySource(categoryForRecommendation(rec)),
      label: "Supporting context",
      detail: rec.reason,
      href: rec.href,
    });
  }

  return evidence.slice(0, 8);
}

function categorySource(category: RecommendationCategory): BriefingSignalSource {
  switch (category) {
    case "reviews":
    case "website":
      return "website-review";
    case "relationship":
    case "client-success":
      return "communications";
    case "deliverables":
      return "deliverables";
    case "projects":
      return "projects";
    default:
      return "work";
  }
}

function buildWhyAppeared(
  rec: BriefingRecommendation,
  context: BriefingInputContext,
  evidence: RecommendationEvidence[],
): string {
  if (rec.id.includes("review-inbox") || rec.actionType === "review-inbox") {
    if (context.reviewInbox.newCount > 0) {
      return `${context.reviewInbox.newCount} website review${context.reviewInbox.newCount === 1 ? "" : "s"} remain untriaged.`;
    }
    return "Website review activity requires operator attention.";
  }

  if (rec.id.includes("comms") || rec.actionType === "respond") {
    return `${context.communications.needsReplyCount} client thread${context.communications.needsReplyCount === 1 ? "" : "s"} ${context.communications.needsReplyCount === 1 ? "is" : "are"} awaiting a studio reply.`;
  }

  if (rec.id.includes("risk-client-silence") || rec.actionType === "relationship") {
    const silentEvidence = evidence.find((item) => item.label === "Client silence");
    if (silentEvidence?.detail) return silentEvidence.detail;
    return "One or more clients have had no timeline activity for an extended period.";
  }

  if (rec.id.includes("risk-work-backlog")) {
    return `${context.work.stats.openCount} open work items are elevating delivery pressure.`;
  }

  if (rec.id.includes("risk-blocked") || rec.title.toLowerCase().includes("unblock")) {
    return `${context.work.stats.blockedCount} work item${context.work.stats.blockedCount === 1 ? "" : "s"} ${context.work.stats.blockedCount === 1 ? "is" : "are"} blocked and cannot progress.`;
  }

  if (rec.id.includes("risk-missed-due-dates") || rec.id.includes("overdue")) {
    return "One or more work items are past their due date.";
  }

  if (rec.id.includes("risk-review-volume")) {
    return `${context.reviewInbox.newCount} untriaged website reviews are increasing response risk.`;
  }

  if (rec.id.includes("risk-repeated-revisions")) {
    return evidence[0]?.detail ?? "Multiple open website reviews suggest repeated revision cycles.";
  }

  if (rec.id.includes("risk-stale-comms")) {
    return `${context.communications.staleUnresolvedCount} client thread${context.communications.staleUnresolvedCount === 1 ? "" : "s"} have gone stale without resolution.`;
  }

  if (rec.id.includes("waiting")) {
    return rec.clientName
      ? `${rec.clientName} input is blocking progress on this work item.`
      : "Client input is blocking progress on this work item.";
  }

  if (rec.id.includes("request")) {
    return "An open client request is awaiting operator triage.";
  }

  if (evidence.length > 0 && evidence[0]?.detail) {
    return evidence[0].detail;
  }

  return rec.reason;
}

function computeSignalConfidence(
  rec: BriefingRecommendation,
  evidence: RecommendationEvidence[],
  historyNotes: RecommendationHistoryNote[],
): IntelligenceConfidence {
  let score = 0;

  if (evidence.length >= 3) score += 3;
  else if (evidence.length === 2) score += 2;
  else if (evidence.length === 1) score += 1;

  if (rec.confidence === "high") score += 2;
  else if (rec.confidence === "medium") score += 1;

  if (rec.businessImpact >= 75) score += 1;

  const hasRecentPattern = historyNotes.some((note) => note.type === "previously-shown");
  if (hasRecentPattern) score += 1;

  const hasLimitedEvidence = evidence.length <= 1 && rec.confidence === "low";
  if (hasLimitedEvidence) score -= 2;

  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function normalizeRecommendationKey(rec: BriefingRecommendation): string {
  return rec.id.replace(/^rec-from-/, "");
}

function titleSimilarity(a: string, b: string): boolean {
  const left = a.toLowerCase().slice(0, 24);
  const right = b.toLowerCase().slice(0, 24);
  return left.length > 8 && right.length > 8 && (left.includes(right) || right.includes(left));
}

function buildHistoryNotes(
  rec: BriefingRecommendation,
  memory: BrainMemoryRecord[],
): RecommendationHistoryNote[] {
  const notes: RecommendationHistoryNote[] = [];
  const key = normalizeRecommendationKey(rec);

  const related = memory.filter(
    (event) =>
      event.recommendationId === rec.id ||
      event.recommendationId === key ||
      (event.title && titleSimilarity(rec.title, event.title)),
  );

  if (related.length === 0) return notes;

  const shown = related
    .filter((event) => event.action === "shown")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (shown) {
    const days = daysSince(shown.createdAt);
    if (days != null && days >= 1) {
      notes.push({
        type: "previously-shown",
        message: `Previously surfaced ${days} day${days === 1 ? "" : "s"} ago.`,
      });
    }
  }

  const completed = related
    .filter((event) => event.action === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (completed) {
    const days = daysSince(completed.createdAt);
    if (days != null && days <= 45) {
      notes.push({
        type: "similar-completed",
        message:
          days <= 30
            ? "Similar recommendation completed recently."
            : "Similar recommendation completed last month.",
      });
    }
  }

  const dismissed = related.find((event) => event.action === "dismissed");
  if (dismissed) {
    const days = daysSince(dismissed.createdAt);
    if (days != null && days <= 14) {
      notes.push({
        type: "previously-dismissed",
        message: `Previously dismissed ${days} day${days === 1 ? "" : "s"} ago.`,
      });
    }
  }

  const ignored = related.find((event) => event.action === "ignored");
  if (ignored) {
    const days = daysSince(ignored.createdAt);
    if (days != null && days <= 30) {
      notes.push({
        type: "previously-ignored",
        message: `Previously ignored ${days} day${days === 1 ? "" : "s"} ago.`,
      });
    }
  }

  return notes.slice(0, 2);
}

export function enrichRecommendation(
  rec: BriefingRecommendation,
  context: BriefingInputContext,
  memory: BrainMemoryRecord[],
  generatedAt: string,
): IntelligentRecommendation {
  const evidence = buildEvidence(rec, context);
  const historyNotes = buildHistoryNotes(rec, memory);
  const signalConfidence = computeSignalConfidence(rec, evidence, historyNotes);

  return {
    ...rec,
    signalConfidence,
    whyAppeared: buildWhyAppeared(rec, context, evidence),
    expectedImpact: expectedImpactFor(rec),
    effort: effortForAction(rec.actionType),
    category: categoryForRecommendation(rec),
    evidence,
    historyNotes,
    generatedAt,
  };
}

export function enrichRecommendations(
  recommendations: BriefingRecommendation[],
  context: BriefingInputContext,
  memory: BrainMemoryRecord[],
  generatedAt: string,
): IntelligentRecommendation[] {
  return recommendations.map((rec) =>
    enrichRecommendation(rec, context, memory, generatedAt),
  );
}

/** @deprecated Use effort from IntelligentRecommendation */
export function effortForActionType(actionType: BriefingActionType): RecommendationEffortLabel {
  return effortForAction(actionType);
}
