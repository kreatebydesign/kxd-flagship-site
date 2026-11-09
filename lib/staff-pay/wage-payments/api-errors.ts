export function staffWagePaymentErrorResponse(error: unknown): { status: number; message: string } {
  if (!(error instanceof Error)) {
    return { status: 500, message: "Wage payment request failed." };
  }
  switch (error.message) {
    case "Staff permission denied: missing admin.payroll.review.":
      return { status: 403, message: "Wage payment recording is not permitted." };
    case "STAFF_WAGE_PAYMENTS_MIGRATION_REQUIRED":
      return {
        status: 503,
        message: "Wage payment ledger migration is required in this environment.",
      };
    case "STAFF_WAGE_PAYMENTS_REQUIRES_POSTGRES":
      return { status: 503, message: "Wage payments require database access." };
    case "WAGE_PAYMENT_REFERENCE_REQUIRED":
      return { status: 400, message: "External payment reference is required." };
    case "WAGE_PAYMENT_INVALID_METHOD":
      return { status: 400, message: "Invalid payment method." };
    case "WAGE_PAYMENT_NO_ALLOCATIONS":
      return { status: 400, message: "At least one wage allocation is required." };
    case "WAGE_PAYMENT_DUPLICATE_ALLOCATION_REQUEST":
      return { status: 400, message: "Duplicate allocation in request." };
    case "WAGE_PAYMENT_SHIFT_NOT_FOUND":
    case "WAGE_PAYMENT_HISTORICAL_NOT_FOUND":
      return { status: 404, message: "Payable source not found." };
    case "WAGE_PAYMENT_STAFF_MISMATCH":
      return { status: 409, message: "Payable source does not belong to this employee." };
    case "WAGE_PAYMENT_SHIFT_NOT_PAYABLE":
    case "WAGE_PAYMENT_HISTORICAL_NOT_PAYABLE":
      return { status: 409, message: "Source is not payable." };
    case "WAGE_PAYMENT_RATE_MISSING":
      return { status: 409, message: "Hourly rate missing for payable source." };
    case "WAGE_PAYMENT_SOURCE_ALREADY_SETTLED":
      return { status: 409, message: "One or more sources are already settled." };
    case "WAGE_PAYMENT_DUPLICATE_REFERENCE":
      return { status: 409, message: "External reference already recorded for this employee." };
    case "WAGE_PAYMENT_NOT_FOUND":
      return { status: 404, message: "Wage payment not found." };
    case "WAGE_PAYMENT_ALREADY_VOIDED":
      return { status: 409, message: "Wage payment is already voided." };
    default:
      if (error.message.startsWith("WAGE_ALLOCATION_GROSS_MISMATCH")) {
        return { status: 500, message: "Allocation gross does not match minutes and rate." };
      }
      return { status: 500, message: "Wage payment request failed." };
  }
}
