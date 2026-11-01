import type { StaffTimePayRequestKind } from "@/lib/staff-pay/employee-view-types";

export type CreateStaffTimePayRequestInput = {
  requestKind: StaffTimePayRequestKind;
  localDateKey: string;
  shiftId?: number | null;
  payPeriodId?: number | null;
  proposedStartAt?: string | null;
  proposedEndAt?: string | null;
  employeeNote: string;
};

const REQUEST_KINDS = new Set<StaffTimePayRequestKind>([
  "shift_acknowledgment",
  "correction_dispute",
  "historical_backfill",
  "historical_timesheet_acknowledgment",
]);

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateCreateStaffTimePayRequestInput(
  input: CreateStaffTimePayRequestInput,
): string | null {
  if (!REQUEST_KINDS.has(input.requestKind)) {
    return "Invalid request type.";
  }
  if (!DATE_KEY_RE.test(input.localDateKey)) {
    return "Valid local date (YYYY-MM-DD) is required.";
  }
  const note = input.employeeNote.trim();
  if (note.length < 3) {
    return "Add a short note (at least 3 characters).";
  }
  if (note.length > 2000) {
    return "Note is too long.";
  }
  if (input.requestKind === "correction_dispute" && !input.shiftId && !input.proposedStartAt) {
    return "Correction requests need a shift or proposed start time.";
  }
  if (
    input.requestKind === "historical_backfill" &&
    !input.proposedStartAt &&
    !input.proposedEndAt &&
    note.length < 10
  ) {
    return "Historical corrections need proposed times or a detailed note.";
  }
  return null;
}
