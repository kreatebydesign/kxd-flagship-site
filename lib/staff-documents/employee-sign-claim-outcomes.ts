export type EmployeeSignClaimKind =
  | "claimed"
  | "already_signed"
  | "not_found"
  | "not_claimable"
  | "expired";

export function resolveEmployeeSignClaimAfterUpdate(input: {
  rowsUpdated: number;
  statusAfter?: string | null;
  hasEmployeeSignature: boolean;
}): { kind: EmployeeSignClaimKind; status?: string } {
  if (input.rowsUpdated > 0) return { kind: "claimed" };
  if (
    input.statusAfter === "awaiting-operator-signature" &&
    input.hasEmployeeSignature
  ) {
    return { kind: "already_signed" };
  }
  if (!input.statusAfter) return { kind: "not_found" };
  return { kind: "not_claimable", status: String(input.statusAfter) };
}
