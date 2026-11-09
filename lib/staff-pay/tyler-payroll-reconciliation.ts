/**
 * Matt Lunger original manual time records (owner-provided payroll source evidence).
 * Reconcile against production Time Clock — never duplicate as shifts.
 */

import { preliminaryGrossCentsForMinutes } from "./money";
import { TYLER_VERIFIED_THROUGH_OCT_29 } from "./tyler-october-historical-reference";

export const TYLER_OWNER_MANUAL_RECORD_SOURCE =
  "Matt Lunger original manual time records (owner-provided payroll evidence, 2026-11-01).";

export const TYLER_HISTORICAL_OCT_15_20_APPROVED_MINUTES = 21 * 60 + 59;

export const TYLER_HISTORICAL_OCT_15_20_APPROVED_GROSS_CENTS = preliminaryGrossCentsForMinutes(
  TYLER_HISTORICAL_OCT_15_20_APPROVED_MINUTES,
  2000,
);

export const TYLER_PRODUCTION_VERIFIED_MINUTES = TYLER_VERIFIED_THROUGH_OCT_29.totalMinutes;

export const TYLER_PRODUCTION_VERIFIED_GROSS_CENTS =
  TYLER_VERIFIED_THROUGH_OCT_29.preliminaryGrossCents;

export const TYLER_COMBINED_DOCUMENTED_GROSS_CENTS =
  TYLER_PRODUCTION_VERIFIED_GROSS_CENTS + TYLER_HISTORICAL_OCT_15_20_APPROVED_GROSS_CENTS;

export const TYLER_PAY_PERIOD_1_DOCUMENTED_GROSS_CENTS =
  TYLER_VERIFIED_THROUGH_OCT_29.payPeriod1GrossCents +
  TYLER_HISTORICAL_OCT_15_20_APPROVED_GROSS_CENTS;

export const TYLER_PAY_PERIOD_2_DOCUMENTED_GROSS_CENTS =
  TYLER_VERIFIED_THROUGH_OCT_29.payPeriod2ThroughOct29GrossCents;

/** Oct 21 — manual note vs production clock (Pacific). */
export const TYLER_OCT_21_2026_RECONCILIATION = {
  localDateKey: "2026-10-21",
  ownerManualSpanLabel: "9:30 AM to 4:00 PM Pacific (manual note)",
  ownerManualGrossSpanMinutes: 6 * 60 + 30,
  productionShiftIds: [1, 2] as const,
  productionTotalMinutes: 311,
  productionPreliminaryGrossCents: preliminaryGrossCentsForMinutes(311, 2000),
  gapBetweenShiftsMinutes: 82,
  verdict:
    "Payable time for Oct 21 follows production Time Clock only (311 minutes, two shifts). Manual 9:30 AM to 4:00 PM is owner reference; it is not added on top. The ~82-minute gap between clock segments aligns with an unpaid break between blocks; do not pay the full 390-minute span without a separate owner adjustment.",
  payableSource: "production_time_clock" as const,
} as const;
