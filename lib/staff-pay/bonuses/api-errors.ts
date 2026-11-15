export function staffDiscretionaryBonusErrorResponse(error: unknown): {
  status: number;
  message: string;
} {
  const code = error instanceof Error ? error.message : "BONUS_UNKNOWN";
  switch (code) {
    case "BONUS_OWNER_ONLY":
      return { status: 403, message: "Only the owner may record discretionary bonuses." };
    case "BONUS_SELF_DENIED":
      return { status: 403, message: "Staff cannot record bonuses for their own account." };
    case "STAFF_BONUSES_MIGRATION_REQUIRED":
      return {
        status: 503,
        message: "Bonus ledger migration is pending. Apply 20261115_harlow_staff_foundation locally first.",
      };
    case "BONUS_IDEMPOTENCY_REQUIRED":
      return { status: 400, message: "idempotencyKey is required." };
    case "BONUS_REASON_REQUIRED":
      return { status: 400, message: "A reason is required." };
    case "BONUS_AMOUNT_INVALID":
      return { status: 400, message: "amountCents must be a positive integer." };
    case "BONUS_INVALID_DATE":
      return { status: 400, message: "bonusDate must be YYYY-MM-DD." };
    case "BONUS_STAFF_REQUIRED":
      return { status: 400, message: "staffUserId is required." };
    case "BONUS_NOT_FOUND":
      return { status: 404, message: "Bonus record not found." };
    case "BONUS_PAYMENT_REFERENCE_REQUIRED":
      return { status: 400, message: "paymentReference and paymentIdempotencyKey are required." };
    case "BONUS_PAYMENT_DUPLICATE":
      return { status: 409, message: "Duplicate bonus payment idempotency key." };
    case "BONUS_PAYMENT_FAILED":
      return { status: 500, message: "Could not record bonus payment." };
    default:
      return {
        status: 500,
        message: error instanceof Error ? error.message : "Could not record bonus.",
      };
  }
}