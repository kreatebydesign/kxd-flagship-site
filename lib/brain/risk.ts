import "server-only";

import type { BrainSignal } from "./types";

export function extractTopRisks(signals: BrainSignal[]): BrainSignal[] {
  return signals
    .filter((s) =>
      [
        "revenue-risk",
        "relationship-risk",
        "infrastructure-risk",
        "delivery-risk",
        "automation-failure",
      ].includes(s.kind),
    )
    .slice(0, 8);
}
