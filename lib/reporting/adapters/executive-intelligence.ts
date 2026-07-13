/**
 * Phase 29B — Executive Intelligence evidence adapter.
 *
 * Does NOT modify Executive Intelligence core.
 * Does NOT import provider SDKs.
 * Emits a consumption bundle EI can read later.
 */

import type { ReportingIntelligenceBundle } from "../compose/intelligence";
import type { ExecutiveReportingEvidence } from "../domain/types";

export function toExecutiveReportingEvidence(
  bundle: ReportingIntelligenceBundle,
): ExecutiveReportingEvidence {
  return {
    clientId: bundle.snapshot.clientId,
    period: bundle.snapshot.period,
    snapshot: bundle.snapshot,
    health: bundle.health,
    momentum: bundle.momentum,
    observations: bundle.observations,
    trends: bundle.trends,
    composedAt: bundle.composedAt,
  };
}

/** Boundary guard helper for verifies — adapter surface must stay provider-free. */
export const EXECUTIVE_REPORTING_EVIDENCE_CONTRACT = [
  "snapshot",
  "health",
  "momentum",
  "observations",
  "trends",
] as const;
