/**
 * Phase 28B — Executive Signals as evidence (facts only).
 * Does not rank or recommend. Signals feed the engine; they do not become a second primary.
 */

import type { EvidenceItem } from "../types";

export interface SignalEvidenceSource {
  id: string;
  title: string;
  summary?: string | null;
  domain?: string | null;
  href?: string | null;
  occurredAt?: string | null;
  businessImpact?: number | null;
  urgency?: string | null;
}

export function collectSignalEvidence(
  signals: SignalEvidenceSource[],
  observedAt: string,
): EvidenceItem[] {
  return signals.slice(0, 8).map((signal, index) => ({
    id: `evidence-signal-${signal.id}`,
    kind: "executive_signal" as const,
    domain: "signal" as const,
    summary: signal.summary || signal.title,
    observedAt: signal.occurredAt || observedAt,
    sourceRef: `signal:${signal.id}`,
    sourceSystem: "executive-signals",
    freshness: "recent" as const,
    completeness: "complete" as const,
    payload: {
      signalId: signal.id,
      title: signal.title,
      domain: signal.domain,
      href: signal.href,
      businessImpact: signal.businessImpact,
      urgency: signal.urgency,
      rank: index,
    },
  }));
}
