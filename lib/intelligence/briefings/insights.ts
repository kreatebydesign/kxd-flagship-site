import type { BrainMemoryRecord } from "@/lib/brain/types";
import { clientId, daysSince } from "../context";
import type { IntelligenceConfidence } from "../types";
import type {
  BriefingChangeItem,
  BriefingInputContext,
  BriefingRisk,
  BusinessHealthSection,
  ExecutiveHealthSnapshot,
  ExecutiveInsight,
  ExecutiveInsightContext,
  ExecutiveInsightTone,
  OperationalHealthSection,
  RelationshipHealthSection,
} from "./types";

const MAX_INSIGHTS = 5;
const MIN_INSIGHTS = 1;

interface InsightCandidate extends ExecutiveInsight {
  score: number;
}

function pushCandidate(list: InsightCandidate[], item: Omit<InsightCandidate, "score"> & { score: number }): void {
  list.push(item);
}

function countTimelineEventsInWindow(
  context: BriefingInputContext,
  startDaysAgo: number,
  endDaysAgo: number,
): number {
  return context.intelligence.executiveTimeline.filter((event) => {
    const days = daysSince(String(event.occurredAt ?? event.createdAt ?? ""));
    if (days == null) return false;
    return days >= startDaysAgo && days < endDaysAgo;
  }).length;
}

function completedWorkInWindow(context: BriefingInputContext, maxDays: number): number {
  return context.work.recentWork.filter((item) => {
    if (item.status !== "completed") return false;
    const days = daysSince(item.completedAt ?? item.updatedAt);
    return days != null && days <= maxDays;
  }).length;
}

function openRequestCount(context: BriefingInputContext): number {
  return context.intelligence.requests.filter((req) =>
    ["new", "triaged", "in-progress", "waiting-on-client"].includes(String(req.status ?? "")),
  ).length;
}

function staleOpenRequests(context: BriefingInputContext): number {
  return context.intelligence.requests.filter((req) => {
    const status = String(req.status ?? "");
    if (!["new", "triaged", "waiting-on-client"].includes(status)) return false;
    const days = daysSince(String(req.createdAt ?? ""));
    return days != null && days >= 7;
  }).length;
}

function buildCompletionInsight(context: BriefingInputContext): InsightCandidate | null {
  const today = context.work.stats.completedTodayCount;
  const week = completedWorkInWindow(context, 7);

  if (today >= 2) {
    return {
      id: "insight-completion-today",
      observation: `Project completion pace increased today with ${today} work items finished. This keeps delivery momentum strong across the portfolio.`,
      whatChanged: `${today} work items completed today.`,
      whyItMatters: "Steady completions reduce backlog pressure and maintain client confidence.",
      tone: "positive",
      timeframe: "Today",
      confidence: "high",
      context: context.work.completedToday.slice(0, 3).map((item) => ({
        id: `work-${item.id}`,
        source: "work",
        label: item.title,
        detail: item.clientName,
        href: item.adminHref,
      })),
      score: 72 + today * 4,
    };
  }

  if (week >= 3 && today === 0) {
    return {
      id: "insight-completion-week",
      observation: `Project completion pace has been steady this week with ${week} work items finished. Delivery rhythm remains healthy.`,
      whatChanged: `${week} work items completed in the last seven days.`,
      whyItMatters: "Consistent throughput signals reliable studio execution.",
      tone: "positive",
      timeframe: "This week",
      confidence: "high",
      context: [{ id: "work-week", source: "work", label: "Work Engine", detail: `${week} completions`, href: "/admin/operations/work" }],
      score: 58 + week * 2,
    };
  }

  return null;
}

function buildOperationalStabilityInsight(
  context: BriefingInputContext,
  operationalHealth: OperationalHealthSection,
): InsightCandidate | null {
  if (context.work.stats.blockedCount > 0) return null;
  if (operationalHealth.level !== "smooth" && operationalHealth.level !== "busy") return null;

  const recentBlocked = context.work.recentWork.filter(
    (item) => item.status === "blocked" && (daysSince(item.updatedAt) ?? 99) <= 7,
  ).length;

  if (recentBlocked > 0) return null;

  return {
    id: "insight-operational-stable",
    observation:
      "Operational health has remained stable with no blocked work in the current period. Execution flow is uninterrupted.",
    whatChanged: "No blocked work items detected.",
    whyItMatters: "Stable operations free attention for growth and client relationship work.",
    tone: "positive",
    timeframe: "This week",
    confidence: "medium",
    relatedHealthArea: "operational",
    context: [
      {
        id: "ops-health",
        source: "platform",
        label: "Operational Health",
        detail: operationalHealth.summary,
      },
    ],
    score: 55,
  };
}

function buildTimelineActivityInsight(context: BriefingInputContext): InsightCandidate | null {
  const thisWeek = countTimelineEventsInWindow(context, 0, 7);
  const lastWeek = countTimelineEventsInWindow(context, 7, 14);

  if (thisWeek === 0) return null;

  if (thisWeek > lastWeek && lastWeek > 0) {
    const delta = thisWeek - lastWeek;
    return {
      id: "insight-timeline-up",
      observation: `Client engagement has increased this week with ${thisWeek} executive timeline events — up from ${lastWeek} last week. Relationship activity is accelerating.`,
      whatChanged: `${delta} more timeline events than the prior week.`,
      whyItMatters: "Active engagement supports trust and reduces relationship drift.",
      tone: "positive",
      timeframe: "This week",
      confidence: "medium",
      relatedHealthArea: "relationship",
      context: [{ id: "timeline", source: "timeline", label: "Executive Timeline", detail: `${thisWeek} events`, href: "/admin/operations/timeline" }],
      score: 50 + delta * 3,
    };
  }

  if (thisWeek >= 3) {
    return {
      id: "insight-timeline-active",
      observation: `${thisWeek} executive timeline events were recorded this week. Client relationships remain active across the portfolio.`,
      whatChanged: "Timeline activity continues at a healthy cadence.",
      whyItMatters: "Visible engagement reduces the risk of silent client relationships.",
      tone: "observational",
      timeframe: "This week",
      confidence: "medium",
      relatedHealthArea: "relationship",
      context: [{ id: "timeline", source: "timeline", label: "Executive Timeline", href: "/admin/operations/timeline" }],
      score: 42,
    };
  }

  return null;
}

function buildReviewInsight(context: BriefingInputContext): InsightCandidate | null {
  const { newCount, activeCount } = context.reviewInbox;

  if (newCount === 0 && activeCount > 0) {
    return {
      id: "insight-review-engaged",
      observation:
        "Website review activity remains engaged with no untriaged backlog. Clients are collaborating without response delays.",
      whatChanged: `${activeCount} active revision${activeCount === 1 ? "" : "s"} in progress.`,
      whyItMatters: "Healthy review loops protect launch quality and client satisfaction.",
      tone: "positive",
      timeframe: "Current",
      confidence: "high",
      context: [{ id: "reviews", source: "website-review", label: "Review Inbox", detail: `${activeCount} active`, href: "/admin/operations/review-inbox" }],
      score: 48,
    };
  }

  if (newCount >= 3) {
    return {
      id: "insight-review-volume",
      observation: `${newCount} new website reviews await triage. Review volume has increased and may affect response time if left unattended.`,
      whatChanged: `${newCount} untriaged website reviews in the inbox.`,
      whyItMatters: "Revision response cadence directly affects client trust during active projects.",
      tone: "observational",
      timeframe: "Today",
      confidence: "high",
      context: [{ id: "reviews-new", source: "website-review", label: "Review Inbox", href: "/admin/operations/review-inbox" }],
      score: 65 + newCount * 2,
    };
  }

  return null;
}

function buildCommunicationsInsight(context: BriefingInputContext): InsightCandidate | null {
  const { needsReplyCount, staleUnresolvedCount } = context.communications;

  if (needsReplyCount === 0 && staleUnresolvedCount === 0) {
    return {
      id: "insight-comms-current",
      observation: "Client response threads are current with no outstanding replies. Communication cadence is healthy.",
      whatChanged: "No communications require studio reply.",
      whyItMatters: "Timely responses reinforce the sense that KXD is attentive and available.",
      tone: "positive",
      timeframe: "Current",
      confidence: "high",
      relatedHealthArea: "relationship",
      context: [{ id: "comms", source: "communications", label: "Communications", href: "/admin/operations/command" }],
      score: 46,
    };
  }

  if (needsReplyCount >= 2) {
    return {
      id: "insight-comms-slow",
      observation: `${needsReplyCount} client threads are awaiting a studio reply. Response time may be affecting relationship health.`,
      whatChanged: `${needsReplyCount} communications marked needs reply.`,
      whyItMatters: "Delayed replies are one of the fastest ways to erode client confidence.",
      tone: "observational",
      timeframe: "Current",
      confidence: "high",
      context: [{ id: "comms-reply", source: "communications", label: "Needs reply", detail: String(needsReplyCount), href: "/admin/operations/command" }],
      score: 60 + needsReplyCount * 3,
    };
  }

  return null;
}

function buildRelationshipInsight(relationshipHealth: RelationshipHealthSection): InsightCandidate | null {
  if (relationshipHealth.level !== "strong") return null;

  return {
    id: "insight-relationship-strong",
    observation: "Relationship health continues at a strong level across active clients. Engagement signals are positive.",
    whatChanged: "Relationship health score remains in the strong range.",
    whyItMatters: "Strong relationships create room for expansion and reduce churn risk.",
    tone: "positive",
    timeframe: "Current",
    confidence: "medium",
    relatedHealthArea: "relationship",
    context: relationshipHealth.signals.slice(0, 3).map((signal, index) => ({
      id: `rel-signal-${index}`,
      source: "timeline" as const,
      label: "Relationship signal",
      detail: signal,
    })),
    score: 44,
  };
}

function buildNoRisksInsight(businessRisks: BriefingRisk[], businessHealth: BusinessHealthSection): InsightCandidate | null {
  if (businessRisks.length > 0) return null;
  if (businessHealth.level !== "excellent" && businessHealth.level !== "healthy") return null;

  return {
    id: "insight-no-risks",
    observation: "No meaningful operational risks were detected in the current briefing. The portfolio posture is calm.",
    whatChanged: "Risk engine found no actionable threats.",
    whyItMatters: "A clear risk picture allows focus on growth rather than firefighting.",
    tone: "positive",
    timeframe: "Today",
    confidence: "high",
    relatedHealthArea: "business",
    context: [{ id: "health", source: "platform", label: "Business Health", detail: businessHealth.summary }],
    score: 40,
  };
}

function buildRequestsInsight(context: BriefingInputContext): InsightCandidate | null {
  const stale = staleOpenRequests(context);
  const open = openRequestCount(context);

  if (open === 0) {
    return {
      id: "insight-no-requests",
      observation: "No overdue client requests are open. The request queue is clear.",
      whatChanged: "All client requests are resolved or in active progress.",
      whyItMatters: "A clear request queue means clients are not waiting on KXD for answers.",
      tone: "positive",
      timeframe: "Current",
      confidence: "high",
      context: [{ id: "requests", source: "client-requests", label: "Client Requests" }],
      score: 38,
    };
  }

  if (stale >= 1) {
    return {
      id: "insight-stale-requests",
      observation: `${stale} client request${stale === 1 ? "" : "s"} ${stale === 1 ? "has" : "have"} been waiting longer than expected. Follow-up may be warranted.`,
      whatChanged: `${stale} open request${stale === 1 ? "" : "s"} older than seven days.`,
      whyItMatters: "Long-waiting requests signal neglect and can escalate into relationship issues.",
      tone: "observational",
      timeframe: "This week",
      confidence: "high",
      context: [{ id: "stale-req", source: "client-requests", label: "Stale requests", detail: String(stale) }],
      score: 62 + stale * 5,
    };
  }

  return null;
}

function buildDeliverableInsight(context: BriefingInputContext): InsightCandidate | null {
  const recent = context.intelligence.deliverables.filter((d) => {
    const status = String(d.status ?? "");
    if (!["delivered", "complete"].includes(status)) return false;
    const days = daysSince(String(d.updatedAt ?? d.createdAt ?? ""));
    return days != null && days <= 14;
  });

  if (recent.length === 0) return null;

  const names = recent
    .slice(0, 2)
    .map((d) => String(d.title ?? "Deliverable"))
    .join(" and ");

  return {
    id: "insight-deliverables",
    observation: `${recent.length} deliverable${recent.length === 1 ? "" : "s"} completed in the last two weeks including ${names}. Delivery commitments are being met.`,
    whatChanged: `${recent.length} recent deliverable completion${recent.length === 1 ? "" : "s"}.`,
    whyItMatters: "Completed deliverables are tangible proof of value delivered to clients.",
    tone: "positive",
    timeframe: "Last 2 weeks",
    confidence: "high",
    context: recent.slice(0, 3).map((d) => ({
      id: `del-${d.id}`,
      source: "deliverables",
      label: String(d.title ?? "Deliverable"),
      detail: clientId(d.client) ? undefined : undefined,
    })),
    score: 52 + recent.length * 3,
  };
}

function buildQuietInsight(
  whatChanged: BriefingChangeItem[],
  businessRisks: BriefingRisk[],
): InsightCandidate {
  if (whatChanged.length === 0 && businessRisks.length === 0) {
    return {
      id: "insight-quiet-clear",
      observation:
        "No significant operational changes since your last visit. Everything remains on track — a good moment to focus on growth initiatives.",
      whatChanged: "Portfolio signals are stable.",
      whyItMatters: "Quiet periods are opportunities for strategic work rather than reactive operations.",
      tone: "quiet",
      timeframe: "Current",
      confidence: "medium",
      context: [],
      score: 35,
    };
  }

  return {
    id: "insight-quiet-steady",
    observation: "The portfolio remains steady with no urgent shifts requiring immediate attention.",
    whatChanged: "Signals are within normal operating range.",
    whyItMatters: "Stability provides space for deliberate decision-making.",
    tone: "quiet",
    timeframe: "Current",
    confidence: "medium",
    context: [],
    score: 30,
  };
}

function buildMemoryInsight(memory: BrainMemoryRecord[]): InsightCandidate | null {
  const recentCompleted = memory.filter((event) => {
    if (event.action !== "completed") return false;
    const days = daysSince(event.createdAt);
    return days != null && days <= 30;
  });

  if (recentCompleted.length === 0) return null;

  return {
    id: "insight-memory-completed",
    observation: "Similar recommendations were completed recently — established patterns are working.",
    whatChanged: `${recentCompleted.length} recommendation${recentCompleted.length === 1 ? "" : "s"} marked completed in the last month.`,
    whyItMatters: "Repeated successful actions build operational confidence and reduce decision fatigue.",
    tone: "positive",
    timeframe: "This month",
    confidence: "medium",
    context: recentCompleted.slice(0, 2).map((event) => ({
      id: `memory-${event.id}`,
      source: "platform",
      label: event.title ?? "Completed recommendation",
      detail: event.action,
    })),
    score: 36,
  };
}

function buildHealthInsight(
  healthSnapshot: ExecutiveHealthSnapshot,
  businessHealth: BusinessHealthSection,
): InsightCandidate | null {
  if (healthSnapshot.overall.level !== "excellent" && healthSnapshot.overall.score < 80) return null;

  return {
    id: "insight-health-strong",
    observation: `Overall intelligence status is ${healthSnapshot.overall.label.toLowerCase()} with a composite score of ${healthSnapshot.overall.score}. Business health factors are well managed.`,
    whatChanged: `Composite health score at ${healthSnapshot.overall.score}.`,
    whyItMatters: "Strong health scores indicate the portfolio is operating within designed capacity.",
    tone: "positive",
    timeframe: "Current",
    confidence: "medium",
    relatedHealthArea: "business",
    context: businessHealth.factors.slice(0, 3).map((factor, index) => ({
      id: `health-factor-${index}`,
      source: "platform",
      label: "Health factor",
      detail: factor,
    })),
    score: 41,
  };
}

function dedupeInsights(insights: InsightCandidate[]): InsightCandidate[] {
  const seen = new Set<string>();
  return insights.filter((insight) => {
    const key = insight.observation.slice(0, 48);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildExecutiveInsights(input: {
  context: BriefingInputContext;
  businessHealth: BusinessHealthSection;
  relationshipHealth: RelationshipHealthSection;
  operationalHealth: OperationalHealthSection;
  healthSnapshot: ExecutiveHealthSnapshot;
  whatChanged: BriefingChangeItem[];
  businessRisks: BriefingRisk[];
  memory: BrainMemoryRecord[];
}): ExecutiveInsight[] {
  const candidates: InsightCandidate[] = [];

  const builders = [
    buildCompletionInsight(input.context),
    buildOperationalStabilityInsight(input.context, input.operationalHealth),
    buildTimelineActivityInsight(input.context),
    buildReviewInsight(input.context),
    buildCommunicationsInsight(input.context),
    buildRelationshipInsight(input.relationshipHealth),
    buildNoRisksInsight(input.businessRisks, input.businessHealth),
    buildRequestsInsight(input.context),
    buildDeliverableInsight(input.context),
    buildMemoryInsight(input.memory),
    buildHealthInsight(input.healthSnapshot, input.businessHealth),
  ];

  for (const candidate of builders) {
    if (candidate) candidates.push(candidate);
  }

  const ranked = dedupeInsights(candidates).sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return [stripScore(buildQuietInsight(input.whatChanged, input.businessRisks))];
  }

  const selected = ranked.slice(0, MAX_INSIGHTS);

  if (selected.length < MIN_INSIGHTS || (selected.length < 3 && !selected.some((i) => i.tone === "quiet"))) {
    const quiet = buildQuietInsight(input.whatChanged, input.businessRisks);
    if (!selected.some((i) => i.id === quiet.id)) {
      selected.push(quiet);
    }
  }

  return selected.slice(0, MAX_INSIGHTS).map(stripScore);
}

function stripScore(insight: InsightCandidate): ExecutiveInsight {
  const { score: _score, ...rest } = insight;
  return rest;
}