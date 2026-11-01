/** Preview-only Tyler payroll QA shift copies (not production punches). */

export const PREVIEW_TYLER_PAYROLL_QA_FIXTURE_ACTION = "preview_payroll_qa_fixture" as const;

export const PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION = "tyler_oct_2026_verified_shifts_v1" as const;

export const PREVIEW_TYLER_PAYROLL_QA_FIXTURE_NOTE =
  "Preview-only QA copy of verified production Time Clock shift for My Time & Pay PR125 testing. Not a live punch. Remove with scripts/remove-preview-tyler-payroll-qa-shifts.ts.";

export type PreviewPayrollQaFixtureAuditMeta = {
  sourceProductionShiftId: number;
  fixtureVersion: typeof PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION;
};
