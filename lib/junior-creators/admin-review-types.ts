export type AdminShiftRow = {
  id: number;
  startedAt: string;
  endedAt: string | null;
  totalMinutes: number;
  status: string;
  weekKey: string;
  hourlyRateCents: number;
  notes: string | null;
  payAdjustmentCents: number;
  estimatedCents: number;
  correctionAudit: unknown[];
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

export type AdminAssignedTaskRow = {
  id: number;
  title: string;
  instructions: string;
  clientLabel: string;
  juniorCreatorUserId: number;
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
  dueAt: string | null;
  status:
    | "assigned"
    | "in_progress"
    | "ready_for_review"
    | "completed"
    | "blocked"
    | "cancelled";
  completionNotes: string | null;
  relatedLink: string | null;
  seedKey: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JuniorCreatorAdminReviewData = {
  weekKey: string;
  creators: AdminCreatorRow[];
  assignedTasks: AdminAssignedTaskRow[];
  totals: {
    weekMinutes: number;
    weekEarningsCents: number;
    weekHoursLabel: string;
    weekEarningsLabel: string;
    activeShifts: number;
  };
};
