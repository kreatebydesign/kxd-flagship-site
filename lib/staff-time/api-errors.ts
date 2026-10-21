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
