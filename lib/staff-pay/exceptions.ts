import type { PayPeriodExceptionKind } from "./types";

/** Blocks marking a period payable (not payment — export readiness). */
export function isBlockingPayPeriodException(kind: PayPeriodExceptionKind): boolean {
  switch (kind) {
    case "active_shift_in_period":
    case "missing_shift_boundaries":
    case "pay_period_mismatch":
      return true;
    case "missing_or_unverified_time":
    case "shift_corrected":
    case "overlap_suspected":
    case "overtime_review_required":
      return false;
    default:
      return false;
  }
}

export function hasBlockingPayPeriodExceptions(
  exceptions: Array<{ kind: PayPeriodExceptionKind }>,
): boolean {
  return exceptions.some((ex) => isBlockingPayPeriodException(ex.kind));
}
