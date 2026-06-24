export type AdminShiftRow = {
  id: number;
  startedAt: string;
  endedAt: string | null;
  totalMinutes: number;
  status: string;
  weekKey: string;
  hourlyRateCents: number;
  notes: string | null;
  estimatedCents: number;
};

export type AdminCreatorRow = {
  id: number;
  displayName: string;
  email: string;
  hourlyRateCents: number;
  active: boolean;
  weekMinutes: number;
  weekEarningsCents: number;
  weekHoursLabel: string;
  weekEarningsLabel: string;
  activeShift: AdminShiftRow | null;
  shifts: AdminShiftRow[];
};

export type JuniorCreatorAdminReviewData = {
  weekKey: string;
  creators: AdminCreatorRow[];
  totals: {
    weekMinutes: number;
    weekEarningsCents: number;
    weekHoursLabel: string;
    weekEarningsLabel: string;
    activeShifts: number;
  };
};
