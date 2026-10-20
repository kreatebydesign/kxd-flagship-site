export type OperatorCountersignClaimKind =
  | "claimed"
  | "already_executing"
  | "not_found"
  | "not_claimable";

export function resolveOperatorCountersignClaimAfterUpdate(input: {
  rowsUpdated: number;
  statusAfter?: string | null;
  hasOperatorSignature: boolean;
}): { kind: OperatorCountersignClaimKind; status?: string } {
  if (input.rowsUpdated > 0) return { kind: "claimed" };
  if (input.statusAfter === "executing" && input.hasOperatorSignature) {
    return { kind: "already_executing" };
  }
  if (!input.statusAfter) return { kind: "not_found" };
  return { kind: "not_claimable", status: String(input.statusAfter) };
}
