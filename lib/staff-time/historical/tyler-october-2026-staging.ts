/**
 * Tyler Rethwill — October 2026 reported hours (staging reference for B8 import).
 * NOT payroll records. Do not insert into production from this module.
 */

import {
  TYLER_LEGACY_STAGING_TOTAL_MINUTES,
  TYLER_OCTOBER_15_20_HISTORICAL_DAYS,
  TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS,
  sumTylerHistoricalNetMinutes,
  tylerHistoricalPreliminaryGrossCents,
} from "../../staff-pay/tyler-october-historical-reference.ts";

export const TYLER_OCTOBER_2026_STAGING_REFERENCE = {
  employeeLabel: "Tyler Rethwill",
  roleTitle: "Business Development & Digital Specialist",
  workLocation: "Oregon",
  provisionalHourlyRateCents: TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS,
  paymentsRecordedCents: 0,
  employmentStartDate: "2026-10-15",
  /** Owner-corrected net minutes (Oct 20 unresolved — excluded). */
  provisionalTotalMinutes: 21 * 60 + 59,
  provisionalGrossEstimateCents: 43967,
  /** Deprecated aggregate that implied Oct 20 minutes; retained for audit diff only. */
  legacyStagingTotalMinutes: TYLER_LEGACY_STAGING_TOTAL_MINUTES,
  days: [
    {
      dateKey: "2026-10-15",
      reportedMinutes: 7 * 60 + 30,
      exactPunchesKnown: false,
      notes: "Exact punch times not yet known.",
    },
    {
      dateKey: "2026-10-16",
      reportedStart: "16:30",
      reportedEnd: "23:30",
      reportedBreakMinutes: 81,
      provisionalNetMinutes: 5 * 60 + 39,
      breakClassificationVerified: true,
      breakUnpaidConfirmedByOwner: true,
      notes: "Matt confirmed 81-minute break was unpaid (2026-11-01).",
    },
    {
      dateKey: "2026-10-17",
      reportedStart: "13:30",
      reportedEnd: "14:00",
      reportedMinutes: 30,
    },
    {
      dateKey: "2026-10-19",
      reportedStart: "10:15",
      reportedEnd: "17:37",
      reportedBreakStart: "12:35",
      reportedBreakEnd: "14:07",
      reportedBreakMinutes: 92,
      provisionalNetMinutes: 5 * 60 + 50,
      breakClassificationVerified: true,
      breakUnpaidConfirmedByOwner: true,
      notes: "Matt confirmed 92-minute break was unpaid (2026-11-01).",
    },
    {
      dateKey: "2026-10-20",
      reportedStart: "10:00",
      reportedEndApprox: "12:30",
      shiftStatus: "owner_approved_duration",
      payableMinutes: 150,
      notes:
        "Matt original manual record: 10:00 AM to 12:30 PM Pacific, 150 minutes, no return same day. Duration ledger only.",
    },
  ],
} as const;
