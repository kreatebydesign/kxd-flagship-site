export function staffTimeErrorResponse(error: unknown): { status: number; message: string } {
  if (!(error instanceof Error)) {
    return { status: 500, message: "Staff time request failed." };
  }
  switch (error.message) {
    case "ACTIVE_SHIFT_EXISTS":
      return {
        status: 409,
        message: "You already have an active shift. End it before starting another.",
      };
    case "NO_ACTIVE_SHIFT":
      return { status: 409, message: "No active shift to end." };
    case "WORK_INTENT_REQUIRED":
    case "WORK_INTENT_CATEGORY_INVALID":
    case "WORK_INTENT_WORK_ID_REQUIRED":
    case "WORK_INTENT_CLIENT_ID_REQUIRED":
    case "WORK_INTENT_NOTE_REQUIRED":
      return { status: 400, message: "Work intent is required to start a shift." };
    case "WORK_INTENT_WORK_NOT_FOUND":
      return { status: 404, message: "Selected work assignment was not found." };
    case "WORK_INTENT_WORK_NOT_ALLOWED":
    case "WORK_INTENT_CLIENT_NOT_ALLOWED":
      return { status: 403, message: "Work intent is outside your assigned scope." };
    case "OPERATOR_TIME_CORRECTION_DENIED":
    case "Staff permission denied: missing admin.time.correct.":
      return { status: 403, message: "Operator time correction is not permitted." };
    case "CORRECTION_REASON_REQUIRED":
    case "CORRECTION_REASON_TOO_LONG":
      return { status: 400, message: "A clear correction reason is required (8–500 characters)." };
    case "CORRECTION_FIELD_REQUIRED":
    case "CORRECTION_NO_CHANGE":
      return { status: 400, message: "Provide a corrected start or end time." };
    case "SHIFT_BOUNDS_REQUIRED":
    case "SHIFT_BOUNDS_INVALID":
    case "SHIFT_END_BEFORE_START":
    case "SHIFT_DURATION_INVALID":
    case "SHIFT_DURATION_TOO_LONG":
    case "SHIFT_START_IN_FUTURE":
      return { status: 400, message: "Shift times are invalid." };
    case "SHIFT_OVERLAP":
      return { status: 409, message: "Shift overlaps another active or completed shift." };
    case "SHIFT_NOT_FOUND":
      return { status: 404, message: "Shift not found." };
    case "SHIFT_VOIDED":
    case "SHIFT_STATUS_NOT_CORRECTABLE":
      return { status: 409, message: "This shift cannot be corrected." };
    case "ACTIVE_SHIFT_END_VIA_CLOCK":
      return { status: 400, message: "End an active shift with the normal clock-out flow." };
    case "STAFF_USER_NOT_FOUND":
      return { status: 404, message: "Staff member not found." };
    case "STAFF_USER_NOT_STAFF":
      return { status: 400, message: "Selected user is not staff." };
    case "PAY_PERIOD_NOT_FOUND":
      return { status: 400, message: "No pay period covers this shift date." };
    default:
      if (error.message.includes("staff_time_shifts_one_active_per_user")) {
        return {
          status: 409,
          message: "You already have an active shift. End it before starting another.",
        };
      }
      return { status: 500, message: "Staff time request failed." };
  }
}

export function readIdempotencyKey(request: Request): string | null {
  const header = request.headers.get("Idempotency-Key")?.trim();
  if (header) return header.slice(0, 120);
  return null;
}
