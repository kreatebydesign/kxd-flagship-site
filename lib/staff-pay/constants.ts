/** Matt-approved initial payroll configuration (V1.4). Paydays remain editable in DB. */
export const STAFF_PAYROLL_DEFAULTS = {
  tylerEmploymentStartDate: "2026-10-15",
  tylerHourlyRateCents: 2000,
  weeklyHoursLimit: 40,
  firstShortPeriod: {
    start: "2026-10-15",
    end: "2026-10-25",
    payday: "2026-10-30",
  },
  firstRegularPeriod: {
    start: "2026-10-26",
    end: "2026-11-08",
    payday: "2026-11-13",
  },
  timezone: "America/Los_Angeles",
} as const;
