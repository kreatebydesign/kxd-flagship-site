export type AcknowledgmentClaimKind =
  | "claimed"
  | "already_acknowledged"
  | "not_found"
  | "not_claimable";

/** Testable decision after atomic UPDATE row count. */
export function resolveAcknowledgmentClaimAfterUpdate(input: {
  rowsUpdated: number;
  statusAfter?: string | null;
  hasAcknowledgment: boolean;
}): AcknowledgmentClaimKind {
  if (input.rowsUpdated > 0) return "claimed";
  if (input.statusAfter === "acknowledged" && input.hasAcknowledgment) {
    return "already_acknowledged";
  }
  if (!input.statusAfter) return "not_found";
  return "not_claimable";
}
