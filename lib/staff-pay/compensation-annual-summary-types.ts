export type StaffAnnualCompensationSummary = {
  staffUserId: number;
  displayName: string;
  taxYear: number;
  approvedMinutes: number;
  hourlyGrossCents: number;
  ownerApprovedHistoricalGrossCents: number;
  bonusGrossCents: number;
  bonusPaidCents: number;
  totalGrossCompensationCents: number;
  wagePaymentsSettledCents: number;
  bonusPaymentsRecordedCents: number;
  totalPaymentsMadeCents: number;
  outstandingApprovedCompensationCents: number;
  disclaimer: string;
};

export function staffAnnualCompensationSummaryToCsv(
  summary: StaffAnnualCompensationSummary,
): string {
  const lines = [
    "field,value_cents,value_display",
    `employee,,"${summary.displayName.replace(/"/g, '""')}"`,
    `tax_year,,${summary.taxYear}`,
    `approved_minutes,,${summary.approvedMinutes}`,
    `hourly_gross,${summary.hourlyGrossCents},`,
    `owner_approved_historical_gross,${summary.ownerApprovedHistoricalGrossCents},`,
    `bonus_gross,${summary.bonusGrossCents},`,
    `total_gross_compensation,${summary.totalGrossCompensationCents},`,
    `wage_payments_settled,${summary.wagePaymentsSettledCents},`,
    `bonus_payments_recorded,${summary.bonusPaymentsRecordedCents},`,
    `total_payments_made,${summary.totalPaymentsMadeCents},`,
    `outstanding_approved_compensation,${summary.outstandingApprovedCompensationCents},`,
  ];
  return `${lines.join("\n")}\n`;
}