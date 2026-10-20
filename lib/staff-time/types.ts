export const STAFF_TIME_SHIFT_STATUSES = ["active", "completed", "unresolved", "voided"] as const;
export type StaffTimeShiftStatus = (typeof STAFF_TIME_SHIFT_STATUSES)[number];

export const STAFF_TIME_PUNCH_EVENT_TYPES = [
  "shift_start",
  "shift_end",
  "paid_break_start",
  "paid_break_end",
  "unpaid_meal_start",
  "unpaid_meal_end",
  "forgotten_clock_out_flag",
  "correction_note",
] as const;
export type StaffTimePunchEventType = (typeof STAFF_TIME_PUNCH_EVENT_TYPES)[number];

export const STAFF_WORK_INTENT_CATEGORIES = [
  "assigned_kxd_work",
  "client_project",
  "meeting",
  "training",
  "internal_operations",
  "other_authorized",
] as const;
export type StaffWorkIntentCategory = (typeof STAFF_WORK_INTENT_CATEGORIES)[number];

export type StaffWorkIntentInput = {
  category: StaffWorkIntentCategory;
  workId?: number | null;
  clientId?: number | null;
  note?: string | null;
};

export type StaffTimeAuditEvent = {
  id: string;
  at: string;
  actorUserId: number;
  action: string;
  reason?: string | null;
  detail?: Record<string, unknown> | null;
};

export type StaffTimeShiftView = {
  id: number;
  status: StaffTimeShiftStatus;
  startedAt: string;
  endedAt: string | null;
  workTimezone: string;
  localDateKey: string;
  workIntent: StaffWorkIntentInput;
  payPeriodId: number | null;
  elapsedMinutes: number | null;
};

export type StaffTimePunchView = {
  id: number;
  eventType: StaffTimePunchEventType;
  recordedAt: string;
  actorUserId: number;
  payload: Record<string, unknown> | null;
};

export type StaffTimeHistoryItem = StaffTimeShiftView & {
  punches: StaffTimePunchView[];
};

export type StaffTimeOversightActiveShift = {
  shiftId: number;
  staffUserId: number;
  staffLabel: string;
  staffRole: string;
  startedAt: string;
  workIntentCategory: StaffWorkIntentCategory;
  workTimezone: string;
  elapsedMinutes: number;
};
