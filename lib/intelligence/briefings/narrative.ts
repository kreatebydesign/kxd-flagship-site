import type {
  BriefingChangeItem,
  BriefingInputContext,
  BriefingPriority,
  BriefingRecommendation,
  BriefingRisk,
  BriefingOpportunity,
  BriefingActionType,
  BusinessHealthLevel,
  BusinessHealthSection,
  ExecutiveHealthSnapshot,
  ExecutiveNarrative,
  OperationalHealthSection,
  RelationshipHealthSection,
} from "./types";

function formatLevelLabel(level: string): string {
  return level
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function levelFromScore(score: number): BusinessHealthLevel {
  if (score >= 85) return "excellent";
  if (score >= 70) return "healthy";
  if (score >= 50) return "needs-attention";
  return "critical";
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function resolveFocusClient(input: {
  whatChanged: BriefingChangeItem[];
  topPriorities: BriefingPriority[];
  recommendedActions: BriefingRecommendation[];
  workCompletedToday: Array<{ clientName: string }>;
}): string | null {
  const counts = new Map<string, number>();

  for (const item of input.workCompletedToday) {
    counts.set(item.clientName, (counts.get(item.clientName) ?? 0) + 2);
  }

  for (const change of input.whatChanged) {
    const name = change.detail.split(" · ")[0]?.trim();
    if (name && name !== "Portfolio") {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  for (const priority of input.topPriorities) {
    if (priority.clientName) {
      counts.set(priority.clientName, (counts.get(priority.clientName) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return null;

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0]!;
  const second = sorted[1];

  if (!second || top[1] > second[1]) return top[0];
  return null;
}

function buildOpeningSentence(input: {
  businessHealth: BusinessHealthSection;
  businessRisks: BriefingRisk[];
  topPriorities: BriefingPriority[];
  completedToday: number;
  opportunities: BriefingOpportunity[];
  focusClient: string | null;
}): string {
  const { businessHealth, businessRisks, topPriorities, completedToday, opportunities, focusClient } =
    input;
  const subject = focusClient ?? "the portfolio";

  const isProductive =
    completedToday >= 2 ||
    (completedToday >= 1 && opportunities.length > 0) ||
    (completedToday >= 1 && businessHealth.level === "excellent");

  if (isProductive) {
    return `Today was a productive day for ${subject}.`;
  }

  if (
    businessRisks.length === 0 &&
    topPriorities.length === 0 &&
    (businessHealth.level === "excellent" || businessHealth.level === "healthy")
  ) {
    return "No significant operational issues were detected today.";
  }

  if (businessRisks.length > 0 && businessHealth.level === "critical") {
    return "Operations require immediate attention across the portfolio.";
  }

  if (businessRisks.length > 0) {
    return "Several signals suggest the portfolio needs focused attention today.";
  }

  if (topPriorities.length > 0) {
    return `Here is where ${subject === "the portfolio" ? "the portfolio" : subject} stands this morning.`;
  }

  return "The portfolio is steady with no urgent decisions pending.";
}

function buildActivitySentence(input: {
  completedToday: number;
  whatChanged: BriefingChangeItem[];
  reviewNew: number;
  reviewActive: number;
  timelineChanges: number;
  workUpdates: number;
}): string | null {
  const parts: string[] = [];

  if (input.completedToday > 0) {
    parts.push(
      `${input.completedToday} work item${input.completedToday === 1 ? "" : "s"} completed`,
    );
  }

  const deliverableChanges = input.whatChanged.filter((item) => item.source === "deliverables").length;
  if (deliverableChanges > 0) {
    parts.push(
      `${deliverableChanges} deliverable${deliverableChanges === 1 ? "" : "s"} finished`,
    );
  }

  if (input.reviewNew > 0 && input.reviewActive > input.reviewNew) {
    parts.push("website review activity increased");
  } else if (input.reviewNew > 0) {
    parts.push(
      `${input.reviewNew} new website review${input.reviewNew === 1 ? "" : "s"} submitted`,
    );
  } else if (input.reviewActive > 0 && input.timelineChanges > 0) {
    parts.push("website review activity remains active");
  }

  if (input.timelineChanges >= 3) {
    parts.push(`${input.timelineChanges} timeline events recorded`);
  }

  if (input.workUpdates > 0 && input.completedToday === 0) {
    parts.push(`${input.workUpdates} work item${input.workUpdates === 1 ? "" : "s"} advanced`);
  }

  if (parts.length === 0) return null;
  return `${joinNatural(parts)}.`;
}

function buildHealthSentence(input: {
  businessHealth: BusinessHealthSection;
  relationshipHealth: RelationshipHealthSection;
  operationalHealth: OperationalHealthSection;
  businessRisks: BriefingRisk[];
  businessOpportunities: BriefingOpportunity[];
}): string | null {
  const { businessHealth, relationshipHealth, operationalHealth, businessRisks, businessOpportunities } =
    input;

  if (businessHealth.level === "excellent" && relationshipHealth.level === "strong") {
    return "Overall client health and relationship engagement remain strong.";
  }

  if (businessHealth.level === "healthy" && businessRisks.length === 0) {
    return "Client activity remains healthy across the portfolio.";
  }

  if (relationshipHealth.level === "cooling" || relationshipHealth.level === "at-risk") {
    return "Relationship engagement has cooled — response cadence may need attention.";
  }

  if (operationalHealth.level === "strained" || operationalHealth.level === "overloaded") {
    return "Operational load is elevated and may affect delivery timing.";
  }

  if (businessOpportunities.length > 0 && businessRisks.length === 0) {
    return "Momentum is positive with room to advance growth work.";
  }

  if (businessHealth.level === "needs-attention" || businessHealth.level === "critical") {
    return `Business health is ${formatLevelLabel(businessHealth.level).toLowerCase()} based on current workload signals.`;
  }

  return null;
}

function buildClosingSentence(input: {
  primaryRecommendation: BriefingRecommendation | null;
  businessRisks: BriefingRisk[];
  topPriorities: BriefingPriority[];
  staleRequest: boolean;
}): string | null {
  if (input.primaryRecommendation) {
    const count =
      input.topPriorities.length + input.businessRisks.length > 1
        ? `${input.topPriorities.length + input.businessRisks.length} items`
        : "One recommendation";

    if (input.primaryRecommendation.title.toLowerCase().includes("launch")) {
      return `${count} require attention — the highest priority is launch readiness.`;
    }

    return `${count === "One recommendation" ? "One recommendation" : "The top priority"} requires attention: ${input.primaryRecommendation.title.toLowerCase()}.`;
  }

  if (input.staleRequest) {
    return "One outstanding request has been waiting longer than expected.";
  }

  if (input.businessRisks.length === 1) {
    return `One risk warrants review: ${input.businessRisks[0]!.title.toLowerCase()}.`;
  }

  return null;
}

export function buildExecutiveNarrative(input: {
  businessHealth: BusinessHealthSection;
  relationshipHealth: RelationshipHealthSection;
  operationalHealth: OperationalHealthSection;
  whatChanged: BriefingChangeItem[];
  topPriorities: BriefingPriority[];
  businessRisks: BriefingRisk[];
  businessOpportunities: BriefingOpportunity[];
  recommendedActions: BriefingRecommendation[];
  reviewInbox: { newCount: number; activeCount: number };
  completedToday: number;
  staleRequest: boolean;
}): ExecutiveNarrative {
  const focusClient = resolveFocusClient({
    whatChanged: input.whatChanged,
    topPriorities: input.topPriorities,
    recommendedActions: input.recommendedActions,
    workCompletedToday: input.whatChanged
      .filter((item) => item.label === "Work completed")
      .map((item) => ({ clientName: item.detail.split(" · ")[0] ?? "Client" })),
  });

  const timelineChanges = input.whatChanged.filter((item) => item.source === "timeline").length;
  const workUpdates = input.whatChanged.filter((item) => item.label === "Work updated").length;

  const sentences: string[] = [];

  sentences.push(
    buildOpeningSentence({
      businessHealth: input.businessHealth,
      businessRisks: input.businessRisks,
      topPriorities: input.topPriorities,
      completedToday: input.completedToday,
      opportunities: input.businessOpportunities,
      focusClient,
    }),
  );

  const activity = buildActivitySentence({
    completedToday: input.completedToday,
    whatChanged: input.whatChanged,
    reviewNew: input.reviewInbox.newCount,
    reviewActive: input.reviewInbox.activeCount,
    timelineChanges,
    workUpdates,
  });
  if (activity) sentences.push(activity);

  const health = buildHealthSentence({
    businessHealth: input.businessHealth,
    relationshipHealth: input.relationshipHealth,
    operationalHealth: input.operationalHealth,
    businessRisks: input.businessRisks,
    businessOpportunities: input.businessOpportunities,
  });
  if (health) sentences.push(health);

  const primaryRecommendation = input.recommendedActions[0] ?? null;
  const closing = buildClosingSentence({
    primaryRecommendation,
    businessRisks: input.businessRisks,
    topPriorities: input.topPriorities,
    staleRequest: input.staleRequest,
  });
  if (closing) sentences.push(closing);

  const text = sentences.join(" ");

  return { text, sentences };
}

export function buildExecutiveHealthSnapshot(input: {
  businessHealth: BusinessHealthSection;
  relationshipHealth: RelationshipHealthSection;
  operationalHealth: OperationalHealthSection;
}): ExecutiveHealthSnapshot {
  const overallScore = Math.round(
    (input.businessHealth.score + input.relationshipHealth.score + input.operationalHealth.score) /
      3,
  );
  const overallLevel = levelFromScore(overallScore);

  return {
    business: {
      level: input.businessHealth.level,
      score: input.businessHealth.score,
      label: formatLevelLabel(input.businessHealth.level),
    },
    relationship: {
      level: input.relationshipHealth.level,
      score: input.relationshipHealth.score,
      label: formatLevelLabel(input.relationshipHealth.level),
    },
    operational: {
      level: input.operationalHealth.level,
      score: input.operationalHealth.score,
      label: formatLevelLabel(input.operationalHealth.level),
    },
    overall: {
      level: overallLevel,
      score: overallScore,
      label: formatLevelLabel(overallLevel),
    },
  };
}

export function selectPrimaryRecommendation(
  recommendations: BriefingRecommendation[],
): BriefingRecommendation | null {
  return recommendations[0] ?? null;
}

export function estimateEffortForAction(actionType: BriefingActionType): string | null {
  switch (actionType) {
    case "follow-up":
      return "5–15 min";
    case "respond":
      return "10–20 min";
    case "review-inbox":
      return "15–30 min";
    case "review-work":
      return "20–40 min";
    case "relationship":
      return "15–30 min";
    case "operations":
      return "15–30 min";
    case "unblock":
      return "30–60 min";
    case "deliver":
      return "30–90 min";
    case "launch":
      return "1–2 hours";
    default:
      return null;
  }
}

export function detectStaleRequest(input: BriefingInputContext): boolean {
  return input.intelligence.requests.some((req) => {
    const status = String(req.status ?? "");
    if (!["new", "triaged", "waiting-on-client"].includes(status)) return false;
    const created = new Date(String(req.createdAt ?? "")).getTime();
    if (Number.isNaN(created)) return false;
    const days = Math.floor((Date.now() - created) / 86_400_000);
    return days >= 7;
  });
}
