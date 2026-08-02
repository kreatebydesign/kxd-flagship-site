/**
 * Phase 6 Batch C0 — daily aggregation period keys (UTC).
 */

import type { ConnectMeterPeriodKind } from "../types";

/** YYYY-MM-DD in UTC for daily aggregation. */
export function connectDailyPeriodKey(at: Date = new Date()): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, "0");
  const d = String(at.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function assertConnectPeriodKind(
  kind: string,
): asserts kind is ConnectMeterPeriodKind {
  if (kind !== "daily") {
    throw new Error(`Unsupported Connect meter period kind: ${kind}`);
  }
}

export function connectMeterAggregateKey(input: {
  organizationId: number;
  meterKey: string;
  periodKind: ConnectMeterPeriodKind;
  periodKey: string;
}): string {
  return `${input.organizationId}:${input.meterKey}:${input.periodKind}:${input.periodKey}`;
}
