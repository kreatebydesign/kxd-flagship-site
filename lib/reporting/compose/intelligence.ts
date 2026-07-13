/**
 * Phase 29B — Reporting intelligence composition.
 * Single entry for snapshot → health → momentum → trends → observations → timeline.
 */

import { composeMetricSnapshot } from "../domain/snapshot";
import type { ReportingCapabilityId } from "../domain/capabilities";
import type {
  MetricSnapshot,
  MonthlyReportCompositionInputs,
  PartnershipReportingBrief,
  PeriodWindow,
  ReportingFact,
} from "../domain/types";
import { evaluateBusinessHealth } from "../health/engine";
import { evaluateMomentum } from "../momentum/engine";
import { generateReportingObservations } from "../observations/engine";
import { buildTrendMemory } from "../trend/memory";
import { buildBusinessTimeline } from "../trend/timeline";

export interface ComposeReportingIntelligenceInput {
  clientId: number;
  period: PeriodWindow;
  /** Newest-first historical snapshots. If omitted, builds from facts for current period only. */
  history?: MetricSnapshot[];
  facts?: ReportingFact[];
  enabledCapabilities: readonly ReportingCapabilityId[];
  composedAt?: string;
}

export interface ReportingIntelligenceBundle {
  snapshot: MetricSnapshot;
  health: ReturnType<typeof evaluateBusinessHealth>;
  momentum: ReturnType<typeof evaluateMomentum>;
  trends: ReturnType<typeof buildTrendMemory>;
  observations: ReturnType<typeof generateReportingObservations>;
  timeline: ReturnType<typeof buildBusinessTimeline>;
  composedAt: string;
}

function recommendationHint(
  observations: ReturnType<typeof generateReportingObservations>,
  health: ReturnType<typeof evaluateBusinessHealth>,
): string | null {
  const attention = observations.find((o) => o.severity === "attention");
  if (attention) return attention.statement;
  if (health.overall.state === "improving") return "Overall business health improving.";
  if (health.overall.state === "healthy") return "Business health remains stable.";
  return null;
}

export function composeReportingIntelligence(
  input: ComposeReportingIntelligenceInput,
): ReportingIntelligenceBundle {
  const composedAt = input.composedAt ?? new Date().toISOString();
  const snapshot =
    input.history?.[0] ??
    composeMetricSnapshot({
      clientId: input.clientId,
      period: input.period,
      facts: input.facts ?? [],
      enabledCapabilities: input.enabledCapabilities,
      composedAt,
    });

  const history = input.history ?? [snapshot];
  const health = evaluateBusinessHealth(snapshot);
  const momentum = evaluateMomentum(history);
  const trends = buildTrendMemory({
    clientId: input.clientId,
    history,
    asOf: composedAt,
  });
  const observations = generateReportingObservations({
    snapshot,
    health,
    momentum,
    trends,
  });
  const timeline = buildBusinessTimeline({
    snapshot,
    health,
    momentum,
    observations,
  });

  return {
    snapshot,
    health,
    momentum,
    trends,
    observations,
    timeline,
    composedAt,
  };
}

export function toPartnershipReportingBrief(
  bundle: ReportingIntelligenceBundle,
): PartnershipReportingBrief {
  return {
    clientId: bundle.snapshot.clientId,
    period: bundle.snapshot.period,
    snapshot: bundle.snapshot,
    health: bundle.health,
    momentum: bundle.momentum,
    observations: bundle.observations,
    trends: bundle.trends,
    timeline: bundle.timeline,
    recommendationHint: recommendationHint(bundle.observations, bundle.health),
    composedAt: bundle.composedAt,
  };
}

export function toMonthlyReportCompositionInputs(
  bundle: ReportingIntelligenceBundle,
): MonthlyReportCompositionInputs {
  return {
    clientId: bundle.snapshot.clientId,
    period: bundle.snapshot.period,
    snapshot: bundle.snapshot,
    health: bundle.health,
    momentum: bundle.momentum,
    trends: bundle.trends,
    observations: bundle.observations,
    timeline: bundle.timeline,
    composedAt: bundle.composedAt,
  };
}
