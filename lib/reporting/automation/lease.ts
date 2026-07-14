/**
 * Phase 33A.1 — Pure lease decision helpers (DB acquire lives in sync-state).
 */

export type ReportingExecutionStatus = "idle" | "running";

export function isReportingLeaseActive(input: {
  executionStatus: ReportingExecutionStatus | string | null | undefined;
  leaseExpiresAt: string | null | undefined;
  now: Date;
}): boolean {
  if (input.executionStatus !== "running") return false;
  if (!input.leaseExpiresAt) return false;
  const expires = Date.parse(input.leaseExpiresAt);
  if (!Number.isFinite(expires)) return false;
  return expires > input.now.getTime();
}

export function reportingLeaseExpiration(
  startedAt: Date,
  leaseMs: number,
): Date {
  return new Date(startedAt.getTime() + Math.max(1_000, leaseMs));
}

export function createReportingRunId(now: Date = new Date()): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `run_${now.getTime().toString(36)}_${rand}`;
}
