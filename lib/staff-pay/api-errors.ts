export function staffPayrollErrorResponse(error: unknown): { status: number; message: string } {
  if (!(error instanceof Error)) {
    return { status: 500, message: "Payroll review request failed." };
  }
  switch (error.message) {
    case "Staff permission denied: missing admin.payroll.review.":
      return { status: 403, message: "Payroll review is not permitted." };
    case "PAY_PERIOD_NOT_FOUND":
      return { status: 404, message: "Pay period not found." };
    case "PAY_PERIOD_REVIEW_REQUIRED_FIRST":
      return { status: 409, message: "Acknowledge period review before marking payable." };
    case "PAY_PERIOD_ALREADY_PAYABLE":
      return { status: 409, message: "Pay period is already marked payable." };
    case "PAY_PERIOD_REVIEW_REQUIRES_POSTGRES":
      return { status: 503, message: "Payroll review requires database access." };
    case "PAY_PERIOD_UNRESOLVED_EXCEPTIONS":
      return {
        status: 409,
        message: "Resolve blocking exceptions before marking this period payable.",
      };
    case "PAY_PERIOD_REVIEW_STALE":
      return {
        status: 409,
        message: "Review is out of date after ledger changes — acknowledge review again.",
      };
    default:
      return { status: 500, message: "Payroll review request failed." };
  }
}
