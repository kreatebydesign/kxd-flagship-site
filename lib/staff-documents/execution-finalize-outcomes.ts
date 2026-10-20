export type ExecutionFinalizeKind =
  | "finalized"
  | "already_executed"
  | "not_found"
  | "not_ready";

export function resolveExecutionFinalizeAfterUpdate(input: {
  rowsUpdated: number;
  statusAfter?: string | null;
}): { kind: ExecutionFinalizeKind; status?: string } {
  if (input.rowsUpdated > 0) return { kind: "finalized" };
  if (input.statusAfter === "executed") return { kind: "already_executed" };
  if (!input.statusAfter) return { kind: "not_found" };
  return { kind: "not_ready", status: String(input.statusAfter) };
}
