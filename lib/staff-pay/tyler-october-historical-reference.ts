/**
 * Tyler Rethwill — Oct 15–20, 2026 pre–Time Clock reported hours (reference only).
 * Not payroll. Not imported to staff_time_shifts without explicit owner approval.
 */

import { preliminaryGrossCentsForMinutes } from "./money";

export const TYLER_RETHWILL_STAFF_USER_ID = 3;

export const TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS = 2000;

export type TylerHistoricalBreakStatus =
  | "none"
  | "pending_verification"
  | "owner_confirmed_unpaid";

export type TylerHistoricalProposedCorrection = {
  intervalLabel: string;
  proposedMinutes: number;
  preliminaryGrossCents: number;
  /** ISO timestamps for employee submit / owner review (America/Los_Angeles). */
  proposedStartAt: string;
  proposedEndAt: string;
  disclaimer: string;
};

export type TylerHistoricalDayStatus =
  | "owner_approved_backfill"
  | "unresolved";

export type TylerHistoricalDayReference = {
  localDateKey: string;
  headline: string;
  status: TylerHistoricalDayStatus;
  /** Payable net minutes when owner has confirmed or punches are settled; null when unresolved. */
  netReportedMinutes: number | null;
  unpaidBreakMinutes: number | null;
  breakStatus: TylerHistoricalBreakStatus;
  employeeNote: string;
  /** Pending owner approval — not included in documented historical subtotal. */
  proposedCorrection?: TylerHistoricalProposedCorrection | null;
  /** Owner / audit trail — not shown verbatim to employee unless mirrored in employeeNote. */
  auditTrail: readonly string[];
};

/** Oct 20, 2026 — reported work interval (Pacific), pending verification. 2h30m @ $20/hr ≈ $50. */
export const TYLER_OCT_20_2026_PROPOSED = {
  localDateKey: "2026-10-20",
  intervalLabel: "Approx. 10:00 AM to 12:30 PM Pacific",
  proposedMinutes: 2 * 60 + 30,
  preliminaryGrossCents: preliminaryGrossCentsForMinutes(2 * 60 + 30, TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS),
  proposedStartAt: "2026-10-20T17:00:00.000Z",
  proposedEndAt: "2026-10-20T19:30:00.000Z",
} as const;

/** Legacy staging aggregate included ~160 implied minutes on Oct 20 to reach 22h9m; not supported by KXD OS records. */
export const TYLER_LEGACY_STAGING_TOTAL_MINUTES = 22 * 60 + 9;

export const TYLER_OCTOBER_15_20_HISTORICAL_DAYS: readonly TylerHistoricalDayReference[] = [
  {
    localDateKey: "2026-10-15",
    headline: "First day — owner manual record",
    status: "owner_approved_backfill",
    netReportedMinutes: 7 * 60 + 30,
    unpaidBreakMinutes: null,
    breakStatus: "none",
    employeeNote:
      "7.5 hours from Matt's original manual record. Owner-approved duration entry (not a Time Clock shift). Unpaid in KXD OS until external payroll runs.",
    auditTrail: [
      "Owner manual record: 7.5 hours.",
      "Matt Lunger owner-approved for duration ledger 2026-11-01.",
    ],
  },
  {
    localDateKey: "2026-10-16",
    headline: "Reported shift with unpaid break",
    status: "owner_approved_backfill",
    netReportedMinutes: 5 * 60 + 39,
    unpaidBreakMinutes: 81,
    breakStatus: "owner_confirmed_unpaid",
    employeeNote:
      "339 minutes net after 81-minute unpaid break (Matt's manual record: 4:30 PM to 11:30 PM Pacific). Owner-approved duration entry. Unpaid in KXD OS.",
    auditTrail: [
      "Reported gross span 4:30 PM to 11:30 PM with 81-minute unpaid break deducted.",
      "Matt confirmed break unpaid and approved 339 net minutes 2026-11-01.",
    ],
  },
  {
    localDateKey: "2026-10-17",
    headline: "Short reported shift",
    status: "owner_approved_backfill",
    netReportedMinutes: 30,
    unpaidBreakMinutes: null,
    breakStatus: "none",
    employeeNote:
      "30 minutes (Matt's manual record: 1:30 PM to 2:00 PM Pacific). Owner-approved duration entry. Unpaid in KXD OS.",
    auditTrail: ["Matt Lunger owner-approved 30 minutes 2026-11-01."],
  },
  {
    localDateKey: "2026-10-19",
    headline: "Reported shift with unpaid meal break",
    status: "owner_approved_backfill",
    netReportedMinutes: 5 * 60 + 50,
    unpaidBreakMinutes: 92,
    breakStatus: "owner_confirmed_unpaid",
    employeeNote:
      "350 minutes net after 92-minute unpaid break (Matt's manual record: 10:15 AM to 5:37 PM, break 12:35 PM to 2:07 PM). Owner-approved duration entry. Unpaid in KXD OS.",
    auditTrail: [
      "Matt confirmed 92-minute break unpaid and approved 350 net minutes 2026-11-01.",
    ],
  },
  {
    localDateKey: "2026-10-20",
    headline: "Sick stop — owner manual record",
    status: "owner_approved_backfill",
    netReportedMinutes: 2 * 60 + 30,
    unpaidBreakMinutes: null,
    breakStatus: "none",
    employeeNote:
      "150 minutes (Matt's manual record: 10:00 AM start, stopped 12:30 PM, no return same day). Owner-approved duration entry; not a Time Clock punch. Unpaid in KXD OS.",
    auditTrail: [
      "Owner manual record: 10:00 AM to 12:30 PM Pacific, 150 minutes; Tyler did not return after leaving sick (Matt confirmed).",
      "No production staff_time_shifts row for 2026-10-20; duration ledger only.",
      "Matt Lunger owner-approved 2026-11-01 from original manual records.",
    ],
  },
] as const;

export function sumTylerHistoricalNetMinutes(
  days: readonly Pick<TylerHistoricalDayReference, "netReportedMinutes">[],
): number {
  return days.reduce((sum, day) => sum + (day.netReportedMinutes ?? 0), 0);
}

export function tylerHistoricalPreliminaryGrossCents(
  days: readonly Pick<TylerHistoricalDayReference, "netReportedMinutes">[] = TYLER_OCTOBER_15_20_HISTORICAL_DAYS.filter(
    (d) => d.status === "owner_approved_backfill",
  ),
): number {
  return preliminaryGrossCentsForMinutes(
    sumTylerHistoricalNetMinutes(days),
    TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS,
  );
}

/** Verified production shifts through 2026-10-29 (inclusive) — from production audit, not live DB in this module. */
export const TYLER_VERIFIED_THROUGH_OCT_29 = {
  shiftCount: 11,
  totalMinutes: 31 * 60 + 45,
  preliminaryGrossCents: 63500,
  payPeriod1GrossCents: 23300,
  payPeriod2ThroughOct29GrossCents: 40200,
} as const;

export function tylerOctober15Through29DocumentedGrossCents(): number {
  return (
    TYLER_VERIFIED_THROUGH_OCT_29.preliminaryGrossCents + tylerHistoricalPreliminaryGrossCents()
  );
}

/** @deprecated use tylerOctober15Through29DocumentedGrossCents */
export const tylerOctober15Through29UnapprovedGrossCents = tylerOctober15Through29DocumentedGrossCents;

/** @deprecated no pending proposed minutes after Oct 20 owner manual approval */
export function sumTylerHistoricalProposedGrossCents(): number {
  return 0;
}

export const TYLER_PENDING_PROPOSED_HISTORICAL_GROSS_CENTS = 0;

export function expectedTylerOwnerApprovedMinutes(): number {
  return sumTylerHistoricalNetMinutes(
    TYLER_OCTOBER_15_20_HISTORICAL_DAYS.filter((d) => d.status === "owner_approved_backfill"),
  );
}

export const TYLER_HISTORICAL_APPROVED_SUBTOTAL_CENTS = tylerHistoricalPreliminaryGrossCents();

export const TYLER_DOCUMENTED_GROSS_SUBTOTAL_CENTS = tylerOctober15Through29DocumentedGrossCents();

export type TylerHistoricalOwnerReviewPayload = {
  staffUserId: number;
  employeeLabel: string;
  windowLabel: string;
  hourlyRateLabel: string;
  verifiedThroughOct29: typeof TYLER_VERIFIED_THROUGH_OCT_29 & {
    minutesLabel: string;
    grossLabel: string;
  };
  historicalOct15Through20: {
    periodLabel: string;
    totalMinutes: number;
    minutesLabel: string;
    preliminaryGrossCents: number;
    grossLabel: string;
    notApproved: true;
    ownerApprovedSubtotalMinutes: number;
    ownerApprovedSubtotalGrossCents: number;
    unresolvedLocalDateKeys: string[];
    pendingProposedGrossCents: number;
    pendingProposedGrossLabel: string;
    days: typeof TYLER_OCTOBER_15_20_HISTORICAL_DAYS;
  };
  october15Through29Unapproved: {
    preliminaryGrossCents: number;
    grossLabel: string;
    disclaimer: string;
    pendingProposedGrossCents: number;
    pendingProposedGrossLabel: string;
  };
  productionDataUnchanged: true;
};
