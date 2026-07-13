/**
 * Reasoning pipeline — turn sources into calm, structured intelligence.
 * Deterministic. No AI generation. Caps noise.
 *
 * Phase 28B boundary: this layer must not re-rank founder-level priorities.
 * Founder primary action ownership lives in lib/executive-intelligence.
 */

import type { BusinessSignalSeverity } from "@/lib/business-brain";
import type { ExecutiveActivityImportance } from "@/lib/activity-engine";
import {
  INTELLIGENCE_SURFACE_LIMIT,
  buildExplanation,
  buildInsight,
  buildRecommendation,
  buildWarning,
  confidenceRank,
  urgencyRank,
} from "./contract";
import type { IntelligenceSources } from "./sources";
import type {
  IntelligenceBundle,
  IntelligenceConfidence,
  IntelligenceInsight,
  IntelligenceQueryContext,
  IntelligenceRecommendation,
  IntelligenceUrgency,
  OperationalWarning,
} from "./types";

function severityToUrgency(severity: BusinessSignalSeverity): IntelligenceUrgency {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "moderate":
      return "medium";
    case "positive":
      return "low";
    default:
      return "low";
  }
}

function activityToUrgency(importance: ExecutiveActivityImportance): IntelligenceUrgency {
  switch (importance) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

function sortInsights(items: IntelligenceInsight[]): IntelligenceInsight[] {
  return [...items].sort((a, b) => {
    const u = urgencyRank(b.urgency) - urgencyRank(a.urgency);
    if (u !== 0) return u;
    return confidenceRank(b.confidence) - confidenceRank(a.confidence);
  });
}

function sortRecommendations(
  items: IntelligenceRecommendation[],
): IntelligenceRecommendation[] {
  return [...items].sort((a, b) => {
    const u = urgencyRank(b.urgency) - urgencyRank(a.urgency);
    if (u !== 0) return u;
    return confidenceRank(b.confidence) - confidenceRank(a.confidence);
  });
}

function sortWarnings(items: OperationalWarning[]): OperationalWarning[] {
  return [...items].sort((a, b) => urgencyRank(b.urgency) - urgencyRank(a.urgency));
}

function cap<T>(items: T[], limit: number): T[] {
  return items.slice(0, Math.max(1, limit));
}

/**
 * Reason over loaded sources. Prefer meaning already established upstream.
 */
export function reasonFromSources(
  sources: IntelligenceSources,
  context: IntelligenceQueryContext = {},
): IntelligenceBundle {
  const limit = context.limit ?? INTELLIGENCE_SURFACE_LIMIT;
  const insights: IntelligenceInsight[] = [];
  const recommendations: IntelligenceRecommendation[] = [];
  const warnings: OperationalWarning[] = [];

  const pulse = sources.pulse;
  const brain = sources.brain;

  if (pulse?.executiveDigest) {
    const digest = pulse.executiveDigest;
    const urgency: IntelligenceUrgency =
      digest.overallTone === "urgent"
        ? "high"
        : digest.overallTone === "alert"
          ? "medium"
          : "low";
    const confidence: IntelligenceConfidence =
      digest.overallTone === "calm" || digest.overallTone === "neutral"
        ? "high"
        : "medium";

    insights.push(
      buildInsight({
        id: "exec-digest",
        domain: "executive",
        title: digest.headline || "Studio posture",
        whatHappened: digest.narrative || digest.headline,
        whyItMatters:
          digest.topChanges[0] ??
          "Pulse is summarizing what changed across the operating system.",
        whatShouldHappenNext:
          urgency === "low"
            ? "Continue with the current ritual — no interruption required."
            : "Review Pulse priorities, then choose one calm next move.",
        confidence,
        urgency,
        disposition: urgency === "low" ? "monitor" : "consider",
        sourceIds: ["pulse", "business-brain"],
        explanation: buildExplanation({
          whyVisible: "Executive Digest is the calm top-line from Pulse.",
          whyRecommended: "Founders need one coherent posture signal, not many alerts.",
          influencingData: [
            {
              sourceId: "pulse",
              label: "Posture",
              detail: pulse.posture?.label ?? pulse.posture?.level ?? "unknown",
            },
            ...digest.topChanges.slice(0, 3).map((change, i) => ({
              sourceId: "pulse" as const,
              label: `Change ${i + 1}`,
              detail: change,
            })),
          ],
          confidenceRationale: `Digest tone is ${digest.overallTone}.`,
          confidence,
        }),
      }),
    );
  }

  if (pulse?.priorities?.length) {
    for (const priority of pulse.priorities.slice(0, 3)) {
      const urgency: IntelligenceUrgency =
        priority.weight >= 0.75 ? "high" : priority.weight >= 0.45 ? "medium" : "low";
      insights.push(
        buildInsight({
          id: `pulse-priority-${priority.id}`,
          domain: "operations",
          title: priority.label,
          whatHappened: priority.context,
          whyItMatters: `Pulse elevated this in ${priority.domain}.`,
          whatShouldHappenNext:
            urgency === "high"
              ? "Give this attention in today's Focus or Work Engine."
              : "Keep this visible; act when capacity allows.",
          confidence: "medium",
          urgency,
          disposition: urgency === "high" ? "consider" : "monitor",
          sourceIds: ["pulse"],
          explanation: buildExplanation({
            whyVisible: "Pulse ranked this among executive priorities.",
            whyRecommended: "Domain weight and supporting Brain signals.",
            influencingData: [
              {
                sourceId: "pulse",
                label: "Domain",
                detail: priority.domain,
              },
              {
                sourceId: "pulse",
                label: "Weight",
                detail: String(priority.weight),
              },
            ],
            confidenceRationale: "Derived from Pulse priority weight — not a hard alert.",
            confidence: "medium",
          }),
        }),
      );
    }
  }

  if (brain?.attention?.length) {
    for (const item of brain.attention.slice(0, 3)) {
      const urgency = severityToUrgency(item.severity);
      if (urgency === "critical" || urgency === "high") {
        warnings.push(
          buildWarning({
            id: `brain-attention-${item.title}`.replace(/\s+/g, "-").toLowerCase(),
            title: item.title,
            whatHappened: item.context,
            whyItMatters: "Business Brain marked this for executive attention.",
            whatShouldHappenNext: "Review the supporting signals before deciding.",
            confidence: "medium",
            urgency,
            sourceIds: ["business-brain"],
            explanation: buildExplanation({
              whyVisible: "Brain attention items surface only when severity warrants notice.",
              whyRecommended: "High-severity attention without inventing new actions.",
              influencingData: [
                {
                  sourceId: "business-brain",
                  label: "Severity",
                  detail: item.severity,
                },
              ],
              confidenceRationale: "Mapped from Brain severity; still requires human judgment.",
              confidence: "medium",
            }),
          }),
        );
      }

      insights.push(
        buildInsight({
          id: `brain-attention-${item.title}`.replace(/\s+/g, "-").toLowerCase(),
          domain: "executive",
          title: item.title,
          whatHappened: item.context,
          whyItMatters: "This is meaning detected by Business Brain — not an automated action.",
          whatShouldHappenNext: "Understand the context, then choose whether to act.",
          confidence: "medium",
          urgency,
          disposition: urgency === "critical" ? "act-now" : "consider",
          sourceIds: ["business-brain"],
        }),
      );
    }
  }

  const notableActivity = sources.recentActivity.filter(
    (item) =>
      !item.read &&
      (item.importance === "high" || item.importance === "critical"),
  );

  for (const item of notableActivity.slice(0, 3)) {
    const urgency = activityToUrgency(item.importance);
    insights.push(
      buildInsight({
        id: `activity-${item.id}`,
        domain: "activity",
        title: item.title,
        whatHappened: item.summary || item.title,
        whyItMatters: "Unnoted executive activity of elevated importance.",
        whatShouldHappenNext: item.href
          ? "Open the related surface and note it when understood."
          : "Open Activity Center and mark it noted after review.",
        confidence: "high",
        urgency,
        disposition: urgency === "critical" ? "act-now" : "consider",
        sourceIds: ["executive-activity"],
        relatedClientId: item.clientId ?? null,
        relatedHref: item.href ?? null,
        explanation: buildExplanation({
          whyVisible: "Unread high-importance Activity Engine events deserve calm notice.",
          whyRecommended: "Activity is facts of movement — not spam alerts.",
          influencingData: [
            {
              sourceId: "executive-activity",
              label: "Importance",
              detail: item.importance,
            },
            {
              sourceId: "executive-activity",
              label: "Module",
              detail: item.sourceModule,
            },
          ],
          confidenceRationale: "Direct Activity Engine evidence with explicit importance.",
          confidence: "high",
        }),
      }),
    );
  }

  if (context.clientId != null && brain?.signals?.length) {
    const clientSignals = brain.signals.filter(
      (signal) => signal.relatedClientId === context.clientId,
    );
    for (const signal of clientSignals.slice(0, 2)) {
      insights.push(
        buildInsight({
          id: `client-signal-${signal.label}`.replace(/\s+/g, "-").toLowerCase(),
          domain: "client",
          title: signal.label,
          whatHappened: signal.meaning,
          whyItMatters: "This signal is scoped to the client in view.",
          whatShouldHappenNext: "Decide whether Client Success needs a human touch.",
          confidence: signal.confidence === "high" ? "high" : "medium",
          urgency: severityToUrgency(signal.severity),
          sourceIds: ["business-brain", "client-success"],
          relatedClientId: context.clientId,
        }),
      );
    }
  }

  /* Quiet default when sources are empty — never invent pressure. */
  if (insights.length === 0) {
    insights.push(
      buildInsight({
        id: "exec-calm-default",
        domain: "executive",
        title: "Operating calmly",
        whatHappened: "No elevated posture or unnoted critical activity is in view.",
        whyItMatters: "Silence is a valid executive state.",
        whatShouldHappenNext: "Proceed with the current workspace without interruption.",
        confidence: "medium",
        urgency: "low",
        disposition: "remember",
        sourceIds: ["executive-workspace"],
        explanation: buildExplanation({
          whyVisible: "KXD Intelligence prefers a calm default over manufactured urgency.",
          whyRecommended: "No high-confidence pressure signals were available.",
          influencingData: sources.available.map((sourceId) => ({
            sourceId,
            label: "Source available",
            detail: sourceId,
          })),
          confidenceRationale: "Absence of elevated signals is itself evidence.",
          confidence: "medium",
        }),
      }),
    );
  }

  /* Turn highest act-now insights into recommendations with explicit reasons. */
  for (const insight of sortInsights(insights).filter((i) => i.shouldActNow).slice(0, 2)) {
    recommendations.push(
      buildRecommendation({
        id: `rec-${insight.id}`,
        title: insight.title,
        reason: insight.whyItMatters,
        suggestedAction: insight.whatShouldHappenNext,
        confidence: insight.confidence,
        urgency: insight.urgency,
        sourceIds: insight.sourceIds,
        relatedClientId: insight.relatedClientId,
        relatedHref: insight.relatedHref,
        explanation: insight.explanation,
        shouldActNow: true,
      }),
    );
  }

  return {
    generatedAt: sources.loadedAt,
    executive: cap(sortInsights(insights), limit),
    recommendations: cap(sortRecommendations(recommendations), Math.min(3, limit)),
    warnings: cap(sortWarnings(warnings), Math.min(3, limit)),
    sourcesAvailable: sources.available,
  };
}
