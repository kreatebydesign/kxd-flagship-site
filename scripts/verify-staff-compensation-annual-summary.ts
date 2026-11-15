/**
 * Annual compensation summary — CSV shape and disclaimer (offline).
 */
import assert from "node:assert/strict";
import {
  staffAnnualCompensationSummaryToCsv,
  type StaffAnnualCompensationSummary,
} from "../lib/staff-pay/compensation-annual-summary-types.ts";

const sample: StaffAnnualCompensationSummary = {
  staffUserId: 88,
  displayName: "Harlow",
  taxYear: 2026,
  approvedMinutes: 120,
  hourlyGrossCents: 2910,
  ownerApprovedHistoricalGrossCents: 0,
  bonusGrossCents: 2500,
  bonusPaidCents: 1000,
  totalGrossCompensationCents: 5410,
  wagePaymentsSettledCents: 0,
  bonusPaymentsRecordedCents: 1000,
  totalPaymentsMadeCents: 1000,
  outstandingApprovedCompensationCents: 4410,
  disclaimer: "test",
};

const csv = staffAnnualCompensationSummaryToCsv(sample);
assert.match(csv, /total_gross_compensation,5410/);
assert.match(csv, /bonus_gross,2500/);
assert.match(csv, /Harlow/);

console.log("verify-staff-compensation-annual-summary: OK");