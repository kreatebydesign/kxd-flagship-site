/**
 * Tyler Rethwill — October 2026 reported hours (staging reference for B8 import).
 * NOT payroll records. Do not insert into production from this module.
 */

export const TYLER_OCTOBER_2026_STAGING_REFERENCE = {
  employeeLabel: "Tyler Rethwill",
  roleTitle: "Business Development & Digital Specialist",
  workLocation: "Oregon",
  provisionalHourlyRateCents: 2000,
  paymentsRecordedCents: 0,
  employmentStartDate: "2026-10-15",
  provisionalTotalMinutes: 22 * 60 + 9,
  provisionalGrossEstimateCents: 44300,
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
      breakClassificationVerified: false,
      notes: "AM/PM interpretation requires confirmation.",
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
      provisionalNetMinutes: 5 * 60 + 50,
      breakClassificationVerified: false,
    },
    {
      dateKey: "2026-10-20",
      reportedStart: "10:00",
      reportedEndApprox: "12:30",
      shiftStatus: "unresolved",
      notes:
        "Stopped due to feeling unwell; return and final end time unknown. Sick leave classification TBD.",
    },
  ],
} as const;
