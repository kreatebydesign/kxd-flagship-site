/**
 * Phase 29B — Business timeline structures (not UI).
 */

import type {
  BusinessHealthReport,
  BusinessTimeline,
  BusinessTimelineEvent,
  MetricSnapshot,
  MomentumReport,
  ReportingObservation,
} from "../domain/types";
import { periodKey } from "../domain/period";

export function buildBusinessTimeline(input: {
  snapshot: MetricSnapshot;
  health: BusinessHealthReport;
  momentum: MomentumReport;
  observations: ReportingObservation[];
}): BusinessTimeline {
  const { snapshot, health, momentum, observations } = input;
  const events: BusinessTimelineEvent[] = [];

  for (const domainHealth of [...health.domains, health.overall]) {
    if (domainHealth.state === "unknown" && domainHealth.factIds.length === 0) continue;
    const domainMomentum =
      domainHealth.domain === "overall"
        ? momentum.overall
        : momentum.domains.find((d) => d.domain === domainHealth.domain);

    const related = observations.filter((o) => o.domain === domainHealth.domain);

    events.push({
      id: `timeline-${snapshot.clientId}-${domainHealth.domain}-${periodKey(snapshot.period)}`,
      clientId: snapshot.clientId,
      period: snapshot.period,
      domain: domainHealth.domain,
      change: `${domainHealth.domain}:${domainHealth.state}:${domainMomentum?.state ?? "unknown"}`,
      health: domainHealth.state,
      momentum: domainMomentum?.state ?? "unknown",
      confidence: domainHealth.confidence,
      observationIds: related.map((o) => o.id),
    });
  }

  return {
    clientId: snapshot.clientId,
    events,
    composedAt: new Date().toISOString(),
  };
}
