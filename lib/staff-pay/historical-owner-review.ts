import "server-only";

import { formatStaffPayMinutesLabel } from "./format-minutes";
import { formatUsdFromCents } from "./money";
import {
  TYLER_OCTOBER_15_20_HISTORICAL_DAYS,
  TYLER_RETHWILL_STAFF_USER_ID,
  TYLER_VERIFIED_THROUGH_OCT_29,
  sumTylerHistoricalNetMinutes,
  sumTylerHistoricalProposedGrossCents,
  tylerHistoricalPreliminaryGrossCents,
  tylerOctober15Through29DocumentedGrossCents,
  type TylerHistoricalOwnerReviewPayload,
} from "./tyler-october-historical-reference";

export type { TylerHistoricalOwnerReviewPayload };

const OWNER_DISCLAIMER =
  "Matt-approved historical durations are recorded in staff_pay_historical_entries when applied. No wage payments recorded. Production Time Clock shifts unchanged.";

export function loadTylerHistoricalOwnerReview(): TylerHistoricalOwnerReviewPayload {
  const approvedDays = TYLER_OCTOBER_15_20_HISTORICAL_DAYS.filter(
    (d) => d.status === "owner_approved_backfill",
  );
  const historicalMinutes = sumTylerHistoricalNetMinutes(approvedDays);
  const historicalGross = tylerHistoricalPreliminaryGrossCents(approvedDays);
  const pendingProposedGross = sumTylerHistoricalProposedGrossCents();
  const unresolvedLocalDateKeys = TYLER_OCTOBER_15_20_HISTORICAL_DAYS.filter(
    (d) => d.status === "unresolved" || d.netReportedMinutes == null,
  ).map((d) => d.localDateKey);

  return {
    staffUserId: TYLER_RETHWILL_STAFF_USER_ID,
    employeeLabel: "Tyler Rethwill",
    windowLabel: "October 15–29, 2026",
    hourlyRateLabel: "$20.00/hr",
    verifiedThroughOct29: {
      ...TYLER_VERIFIED_THROUGH_OCT_29,
      minutesLabel: formatStaffPayMinutesLabel(TYLER_VERIFIED_THROUGH_OCT_29.totalMinutes),
      grossLabel: formatUsdFromCents(TYLER_VERIFIED_THROUGH_OCT_29.preliminaryGrossCents),
    },
    historicalOct15Through20: {
      periodLabel: "Oct 15–20, 2026 (before Time Clock ledger)",
      totalMinutes: historicalMinutes,
      minutesLabel: formatStaffPayMinutesLabel(historicalMinutes),
      preliminaryGrossCents: historicalGross,
      grossLabel: formatUsdFromCents(historicalGross),
      notApproved: true,
      ownerApprovedSubtotalMinutes: historicalMinutes,
      ownerApprovedSubtotalGrossCents: historicalGross,
      unresolvedLocalDateKeys,
      pendingProposedGrossCents: pendingProposedGross,
      pendingProposedGrossLabel: formatUsdFromCents(pendingProposedGross),
      days: TYLER_OCTOBER_15_20_HISTORICAL_DAYS,
    },
    october15Through29Unapproved: {
      preliminaryGrossCents: tylerOctober15Through29DocumentedGrossCents(),
      grossLabel: formatUsdFromCents(tylerOctober15Through29DocumentedGrossCents()),
      disclaimer: OWNER_DISCLAIMER,
      pendingProposedGrossCents: pendingProposedGross,
      pendingProposedGrossLabel: formatUsdFromCents(pendingProposedGross),
    },
    productionDataUnchanged: true,
  };
}
