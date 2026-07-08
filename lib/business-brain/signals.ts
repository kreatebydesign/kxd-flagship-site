import type { Observation } from "@/lib/observer/types";
import { BUSINESS_SIGNAL_TAXONOMY } from "./taxonomy";
import type { BusinessSignal } from "./types";
import {
  fingerprints,
  observationsMatching,
  severityFromImportance,
  signalId,
} from "./utils";

function buildSignal(
  taxonomy: (typeof BUSINESS_SIGNAL_TAXONOMY)[keyof typeof BUSINESS_SIGNAL_TAXONOMY],
  key: string,
  label: string,
  meaning: string,
  matched: Observation[],
  severityOverride?: BusinessSignal["severity"],
): BusinessSignal | null {
  if (matched.length === 0) return null;

  const importanceRank = matched.some((o) => o.importance === "critical")
    ? "critical"
    : matched.some((o) => o.importance === "high")
      ? "high"
      : "medium";

  const top = matched[0]!;
  const clientObs = matched.find((o) => o.relatedClientId != null);

  return {
    id: signalId(taxonomy, key),
    taxonomy,
    label,
    meaning,
    severity: severityOverride ?? severityFromImportance(
      importanceRank === "critical" ? "critical" : importanceRank === "high" ? "high" : "normal",
    ),
    confidence: matched.length >= 3 ? "high" : matched.length >= 2 ? "medium" : top.confidence,
    observationFingerprints: fingerprints(matched),
    relatedClientId: clientObs?.relatedClientId ?? null,
    relatedClientName: clientObs?.relatedClientName ?? null,
  };
}

/**
 * Derive interpreted business signals from current observations.
 */
export function buildBusinessSignals(observations: Observation[]): BusinessSignal[] {
  const signals: BusinessSignal[] = [];

  // Delivery pressure
  const deliveryObs = observationsMatching(
    observations,
    (o) =>
      o.source === "deliverables" &&
      (o.category === "threshold" || o.fingerprint.includes("due")),
  );
  const deliverySignal = buildSignal(
    BUSINESS_SIGNAL_TAXONOMY.DELIVERY_PRESSURE,
    "portfolio",
    "Delivery pressure",
    deliveryObs.length >= 3
      ? "Delivery pressure is elevated across the portfolio."
      : deliveryObs.length > 0
        ? "Upcoming deliverables are creating delivery pressure."
        : "",
    deliveryObs,
    deliveryObs.length >= 5 ? "high" : deliveryObs.length >= 2 ? "moderate" : "low",
  );
  if (deliverySignal) signals.push(deliverySignal);

  // Review backlog
  const reviewObs = observationsMatching(
    observations,
    (o) =>
      o.source === "review" &&
      !o.fingerprint.includes("inbox:clear") &&
      (o.fingerprint.includes("new:") || o.fingerprint.includes("active:") || o.category === "event"),
  );
  const newReviewCount = reviewObs.filter((o) => o.fingerprint.startsWith("review:state:new:")).length;
  const reviewSignal = buildSignal(
    BUSINESS_SIGNAL_TAXONOMY.REVIEW_BACKLOG,
    "portfolio",
    "Review backlog",
    newReviewCount > 0
      ? "Website review volume is building in the inbox."
      : reviewObs.some((o) => o.fingerprint.includes("active:"))
        ? "Active website revisions are in progress across clients."
        : "Review activity is present in the portfolio.",
    reviewObs,
    newReviewCount >= 3 ? "high" : newReviewCount > 0 ? "moderate" : "low",
  );
  if (reviewSignal) signals.push(reviewSignal);

  // Operational load
  const opsObs = observationsMatching(
    observations,
    (o) =>
      o.source === "operational-health" ||
      (o.source === "work" && o.fingerprint.includes("open-count")),
  );
  const blockedObs = observationsMatching(
    observations,
    (o) => o.source === "work" && (o.fingerprint.includes("blocked") || o.category === "threshold"),
  );
  const loadSeverity =
    blockedObs.length >= 3 ? "critical" : blockedObs.length > 0 ? "high" : opsObs.some((o) => o.importance === "high") ? "moderate" : "low";
  const opsSignal = buildSignal(
    BUSINESS_SIGNAL_TAXONOMY.OPERATIONS_LOAD,
    "portfolio",
    "Operational load",
    blockedObs.length > 0
      ? `Operational load is elevated with ${blockedObs.length} blocked work signal${blockedObs.length === 1 ? "" : "s"}.`
      : opsObs.length > 0
        ? "Studio operations are carrying a measurable execution load."
        : "",
    [...opsObs, ...blockedObs],
    loadSeverity,
  );
  if (opsSignal) signals.push(opsSignal);

  // Overdue / communications risk
  const overdueObs = observationsMatching(
    observations,
    (o) =>
      o.source === "communications" &&
      (o.fingerprint.includes("stale") || o.fingerprint.includes("overdue-followup")),
  );
  const overdueSignal = buildSignal(
    BUSINESS_SIGNAL_TAXONOMY.OVERDUE_RISK,
    "communications",
    "Follow-up risk",
    overdueObs.length > 0
      ? "Client communication follow-ups are overdue or stale."
      : "",
    overdueObs,
    overdueObs.length >= 2 ? "high" : "moderate",
  );
  if (overdueSignal) signals.push(overdueSignal);

  // Communications attention
  const commsObs = observationsMatching(
    observations,
    (o) => o.source === "communications" && o.fingerprint.includes("needs-reply"),
  );
  const commsSignal = buildSignal(
    BUSINESS_SIGNAL_TAXONOMY.COMMUNICATIONS_ATTENTION,
    "portfolio",
    "Communications attention",
    commsObs.length > 0
      ? "Client threads are waiting on studio response."
      : "",
    commsObs,
    commsObs.length >= 3 ? "high" : commsObs.length > 0 ? "moderate" : "low",
  );
  if (commsSignal) signals.push(commsSignal);

  // Relationship engagement
  const timelineObs = observationsMatching(
    observations,
    (o) => o.source === "timeline" && o.category === "event",
  );
  const relHealthObs = observationsMatching(
    observations,
    (o) => o.source === "relationship-health",
  );
  const engagementSignal = buildSignal(
    BUSINESS_SIGNAL_TAXONOMY.RELATIONSHIP_ENGAGEMENT,
    "portfolio",
    "Relationship engagement",
    timelineObs.length >= 5
      ? "Relationship activity is visible across the executive timeline."
      : timelineObs.length > 0
        ? "Recent relationship events are recorded on the timeline."
        : relHealthObs.some((o) => o.fact.includes("cooling") || o.fact.includes("at risk"))
          ? "Relationship engagement signals warrant awareness."
          : "Relationship engagement appears steady.",
    [...timelineObs.slice(0, 10), ...relHealthObs.slice(0, 3)],
    relHealthObs.some((o) => o.importance === "critical" || o.fact.includes("at risk"))
      ? "high"
      : timelineObs.length >= 3
        ? "positive"
        : "moderate",
  );
  if (engagementSignal) signals.push(engagementSignal);

  // Execution momentum
  const momentumObs = observationsMatching(
    observations,
    (o) =>
      o.source === "work" &&
      (o.fingerprint.includes("completed-today") || o.category === "lifecycle"),
  );
  const clearObs = observationsMatching(
    observations,
    (o) => o.fingerprint.includes(":clear") || o.fact.toLowerCase().includes("clear"),
  );
  if (momentumObs.length > 0) {
    signals.push({
      id: signalId(BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM, "today"),
      taxonomy: BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM,
      label: "Execution momentum",
      meaning: "Work is moving forward — completions recorded today.",
      severity: "positive",
      confidence: "high",
      observationFingerprints: fingerprints(momentumObs),
      relatedClientId: null,
      relatedClientName: null,
    });
  } else if (clearObs.length >= 3) {
    signals.push({
      id: signalId(BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM, "clear"),
      taxonomy: BUSINESS_SIGNAL_TAXONOMY.EXECUTION_MOMENTUM,
      label: "Execution momentum",
      meaning: "Execution queues are clear across observed systems.",
      severity: "positive",
      confidence: "medium",
      observationFingerprints: fingerprints(clearObs),
      relatedClientId: null,
      relatedClientName: null,
    });
  }

  // Business health pressure
  const healthObs = observationsMatching(
    observations,
    (o) =>
      o.source === "business-health" &&
      (o.importance === "critical" || o.importance === "high" || o.category === "health-signal"),
  );
  const healthSignal = buildSignal(
    BUSINESS_SIGNAL_TAXONOMY.HEALTH_PRESSURE,
    "portfolio",
    "Business health pressure",
    healthObs.some((o) => o.fact.includes("critical") || o.fact.includes("needs-attention"))
      ? "Business health indicators show elevated pressure."
      : healthObs.length > 0
        ? "Business health signals are present in the portfolio."
        : "",
    healthObs,
    healthObs.some((o) => o.importance === "critical") ? "critical" : "moderate",
  );
  if (healthSignal) signals.push(healthSignal);

  // Memory lifecycle
  const memoryObs = observationsMatching(
    observations,
    (o) => o.source === "brain-memory" && o.category === "memory",
  );
  const memorySignal = buildSignal(
    BUSINESS_SIGNAL_TAXONOMY.MEMORY_LIFECYCLE,
    "portfolio",
    "Recommendation memory",
    memoryObs.length > 0
      ? "Recommendation lifecycle events are recorded in brain memory."
      : "",
    memoryObs,
    "low",
  );
  if (memorySignal) signals.push(memorySignal);

  // Open client requests
  const requestObs = observationsMatching(
    observations,
    (o) => o.source === "client-request" && !o.fingerprint.includes("requests:clear"),
  );
  const requestSignal = buildSignal(
    BUSINESS_SIGNAL_TAXONOMY.CLIENT_REQUESTS,
    "portfolio",
    "Open client requests",
    requestObs.length > 0
      ? "Client requests remain open across the portal."
      : "",
    requestObs,
    requestObs.length > 8 ? "high" : requestObs.length > 0 ? "moderate" : "low",
  );
  if (requestSignal) signals.push(requestSignal);

  return signals;
}
