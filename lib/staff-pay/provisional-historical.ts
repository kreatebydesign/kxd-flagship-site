import { preliminaryGrossCentsForMinutes } from "./money";
import {
  TYLER_OCTOBER_15_20_HISTORICAL_DAYS,
  TYLER_RETHWILL_STAFF_USER_ID,
  TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS,
  TYLER_PENDING_PROPOSED_HISTORICAL_GROSS_CENTS,
  sumTylerHistoricalNetMinutes,
  type TylerHistoricalDayStatus,
} from "./tyler-october-historical-reference";

/** Safe employee-facing DTO — never import staging module in client bundles. */
export type ProvisionalHistoricalProposedCorrectionView = {
  intervalLabel: string;
  proposedMinutes: number;
  preliminaryGrossCents: number;
  proposedStartAt: string;
  proposedEndAt: string;
  disclaimer: string;
};

export type ProvisionalHistoricalDayView = {
  localDateKey: string;
  headline: string;
  status: TylerHistoricalDayStatus;
  reportedMinutes: number | null;
  preliminaryGrossCents: number | null;
  breakStatus: "none" | "pending_verification" | "owner_confirmed_unpaid";
  employeeNote: string;
  proposedCorrection: ProvisionalHistoricalProposedCorrectionView | null;
};

export type ProvisionalHistoricalSummary = {
  periodLabel: string;
  /** Owner-approved payable minutes (Oct 15–20, Matt manual records). */
  ownerApprovedTotalMinutes: number;
  ownerApprovedPreliminaryGrossCents: number;
  pendingProposedGrossCents: number;
  disclaimer: string;
  unpaidInKxdOs: true;
  unresolvedLocalDateKeys: string[];
  days: ProvisionalHistoricalDayView[];
};

const PROVISIONAL_DISCLAIMER =
  "Matt's original manual records for Oct 15–20, stored as owner-approved duration entries (not Time Clock punches). Unpaid in KXD OS. Oct 21 onward uses production Time Clock unless Matt authorizes a separate adjustment.";

/**
 * Server-only historical summary for eligible employees.
 * Returns null when no reference exists for this staff user.
 */
export function loadProvisionalHistoricalSummary(
  staffUserId: number,
): ProvisionalHistoricalSummary | null {
  if (staffUserId !== TYLER_RETHWILL_STAFF_USER_ID) {
    return null;
  }

  const days: ProvisionalHistoricalDayView[] = TYLER_OCTOBER_15_20_HISTORICAL_DAYS.map((day) => ({
    localDateKey: day.localDateKey,
    headline: day.headline,
    status: day.status,
    reportedMinutes: day.netReportedMinutes,
    preliminaryGrossCents:
      day.netReportedMinutes != null
        ? preliminaryGrossCentsForMinutes(
            day.netReportedMinutes,
            TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS,
          )
        : null,
    breakStatus: day.breakStatus,
    employeeNote: day.employeeNote,
    proposedCorrection: day.proposedCorrection
      ? {
          intervalLabel: day.proposedCorrection.intervalLabel,
          proposedMinutes: day.proposedCorrection.proposedMinutes,
          preliminaryGrossCents: day.proposedCorrection.preliminaryGrossCents,
          proposedStartAt: day.proposedCorrection.proposedStartAt,
          proposedEndAt: day.proposedCorrection.proposedEndAt,
          disclaimer: day.proposedCorrection.disclaimer,
        }
      : null,
  }));

  const ownerApprovedTotalMinutes = sumTylerHistoricalNetMinutes(
    TYLER_OCTOBER_15_20_HISTORICAL_DAYS.filter((d) => d.status === "owner_approved_backfill"),
  );
  const unresolvedLocalDateKeys = days
    .filter((d) => d.status === "unresolved")
    .map((d) => d.localDateKey);

  return {
    periodLabel: "Oct 15–20, 2026 (owner-approved historical, not Time Clock)",
    ownerApprovedTotalMinutes,
    ownerApprovedPreliminaryGrossCents: preliminaryGrossCentsForMinutes(
      ownerApprovedTotalMinutes,
      TYLER_OCTOBER_HISTORICAL_HOURLY_RATE_CENTS,
    ),
    pendingProposedGrossCents: TYLER_PENDING_PROPOSED_HISTORICAL_GROSS_CENTS,
    disclaimer: PROVISIONAL_DISCLAIMER,
    unpaidInKxdOs: true,
    unresolvedLocalDateKeys,
    days,
  };
}
