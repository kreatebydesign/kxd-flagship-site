/**
 * Attribution ↔ inquiry reconciliation helpers.
 * Evidence ≠ receipt ≠ verification ≠ sale ≠ commission.
 */

import type { ReconciliationState } from "./types";

export type ReconciliationSignals = {
  hasReceivedInquiry: boolean;
  hasAttributionEvidence: boolean;
  /** When policy disables reconciliation. */
  reconciliationEnabled: boolean;
};

export function resolveReconciliationState(
  signals: ReconciliationSignals,
): ReconciliationState {
  if (!signals.reconciliationEnabled) return "not_applicable";
  if (signals.hasReceivedInquiry && signals.hasAttributionEvidence) return "matched";
  if (signals.hasReceivedInquiry && !signals.hasAttributionEvidence) {
    return "inquiry_without_ads";
  }
  if (!signals.hasReceivedInquiry && signals.hasAttributionEvidence) {
    return "ads_without_inquiry";
  }
  return "unlinked";
}

export function reconciliationLabel(state: ReconciliationState): string {
  switch (state) {
    case "matched":
      return "Matched";
    case "ads_without_inquiry":
      return "Ads without inquiry";
    case "inquiry_without_ads":
      return "Inquiry without ads";
    case "not_applicable":
      return "Not applicable";
    default:
      return "Unlinked";
  }
}
