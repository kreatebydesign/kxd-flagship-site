/**
 * Tyler Oct 2026 wage settlement fixture for preview/local QA only.
 * Shift IDs assume preview copy from production (1–12).
 */
import { preliminaryGrossCentsForMinutes } from "../money";
import { TYLER_OCTOBER_15_20_HISTORICAL_DAYS } from "../tyler-october-historical-reference";
import type { StaffWagePayableSourceRef } from "./types";

export const TYLER_OCT_2026_ZELLE_REFERENCE = "WFCT22V79F3P";

export const TYLER_OCT_2026_COVERED_SHIFT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export const TYLER_OCT_2026_UNPAID_SHIFT_ID = 12;

export const TYLER_SHIFT_MINUTES: Record<number, number> = {
  1: 154,
  2: 157,
  3: 269,
  4: 119,
  5: 177,
  6: 51,
  7: 196,
  8: 209,
  9: 173,
  10: 193,
  11: 207,
  12: 235,
};

const HOURLY_RATE_CENTS = 2000;

export function tylerHistoricalMinutesTotal(): number {
  return TYLER_OCTOBER_15_20_HISTORICAL_DAYS.filter(
    (d) => d.status === "owner_approved_backfill",
  ).reduce((s, d) => s + (d.netReportedMinutes ?? 0), 0);
}

export function tylerDocumentedGrossCentsFixture(): number {
  const shiftMinutes = Object.values(TYLER_SHIFT_MINUTES).reduce((s, m) => s + m, 0);
  const histMinutes = tylerHistoricalMinutesTotal();
  return preliminaryGrossCentsForMinutes(shiftMinutes + histMinutes, HOURLY_RATE_CENTS);
}

export function tylerCoveredPaymentGrossCentsFixture(): number {
  const coveredShiftMinutes = TYLER_OCT_2026_COVERED_SHIFT_IDS.reduce(
    (s, id) => s + TYLER_SHIFT_MINUTES[id],
    0,
  );
  const histMinutes = tylerHistoricalMinutesTotal();
  return preliminaryGrossCentsForMinutes(coveredShiftMinutes + histMinutes, HOURLY_RATE_CENTS);
}

export function tylerOutstandingGrossCentsFixture(): number {
  return preliminaryGrossCentsForMinutes(TYLER_SHIFT_MINUTES[TYLER_OCT_2026_UNPAID_SHIFT_ID], HOURLY_RATE_CENTS);
}

/** Allocation request for covered Oct 15–29 payment — historical IDs filled at runtime in DB tests. */
export function tylerCoveredShiftAllocationRefs(): StaffWagePayableSourceRef[] {
  return TYLER_OCT_2026_COVERED_SHIFT_IDS.map((shiftId) => ({
    sourceKind: "time_shift" as const,
    shiftId,
  }));
}
