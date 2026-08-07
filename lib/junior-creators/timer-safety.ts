/**
 * Junior Creator Timer Safety V1 — constants + pure accounting rules.
 *
 * Boundary: KXD OS browser/session activity only (no OS-level monitoring).
 *
 * Accounting rule (inactivity auto-stop):
 *   endedAt = lastActivityAt + INACTIVITY_WARNING_MS
 *   totalMinutes = minutesBetween(startedAt, endedAt)
 *
 * Grace period is UX-only (time to answer “Are you still working?”).
 * Unanswered grace does NOT extend payable time past the inactivity cutoff.
 *
 * Accounting rule (max-shift auto-stop):
 *   endedAt = startedAt + MAX_SHIFT_MS
 *   (hard cap; never pay beyond the max continuous session)
 *
 * lastActivityAt is always written by the server clock on heartbeat.
 * Clients may signal activity but cannot supply timestamps that inflate pay.
 */

export const JUNIOR_TIMER_SAFETY = {
  /** No KXD OS activity for this long → show “Are you still working?” */
  inactivityWarningMs: 20 * 60 * 1000,
  /** Extra wait after warning before auto-stop. Not payable beyond the warning cutoff. */
  inactivityGraceMs: 5 * 60 * 1000,
  /**
   * Hard maximum continuous active shift.
   * Junior research sessions are intended as focused blocks (not overnight timers).
   * 4 hours is a conservative V1 cap requiring an explicit new start afterward.
   */
  maxShiftMs: 4 * 60 * 60 * 1000,
  /** Server ignores heartbeat writes closer than this (DB write throttle). */
  heartbeatMinIntervalMs: 45 * 1000,
  /** Client-side activity → heartbeat throttle. */
  clientHeartbeatThrottleMs: 60 * 1000,
} as const;

export type JuniorShiftStopReason =
  | "manual"
  | "admin_correction"
  | "inactivity_timeout"
  | "max_shift_timeout"
  | "system_recovery";

export type AutoStopDecision =
  | { action: "none" }
  | {
      action: "stop";
      stopReason: Extract<JuniorShiftStopReason, "inactivity_timeout" | "max_shift_timeout">;
      endedAt: Date;
      lastActivityAt: Date;
      automaticStopAt: Date;
    };

export function resolveLastActivityAt(args: {
  lastActivityAt: string | Date | null | undefined;
  startedAt: string | Date;
}): Date {
  if (args.lastActivityAt) {
    const parsed = new Date(args.lastActivityAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(args.startedAt);
}

/**
 * Decide whether an active shift should be auto-stopped at `now`.
 * Max-shift wins when both thresholds are exceeded (clearer audit reason).
 */
export function decideAutoStop(args: {
  startedAt: string | Date;
  lastActivityAt?: string | Date | null;
  now?: Date;
}): AutoStopDecision {
  const now = args.now ?? new Date();
  const startedAt = new Date(args.startedAt);
  if (Number.isNaN(startedAt.getTime())) return { action: "none" };

  const lastActivityAt = resolveLastActivityAt({
    lastActivityAt: args.lastActivityAt,
    startedAt,
  });

  const maxEndedAt = new Date(startedAt.getTime() + JUNIOR_TIMER_SAFETY.maxShiftMs);
  if (now.getTime() >= maxEndedAt.getTime()) {
    return {
      action: "stop",
      stopReason: "max_shift_timeout",
      endedAt: maxEndedAt,
      lastActivityAt,
      automaticStopAt: now,
    };
  }

  const inactivityCutoff = new Date(
    lastActivityAt.getTime() + JUNIOR_TIMER_SAFETY.inactivityWarningMs,
  );
  const graceDeadline = new Date(
    inactivityCutoff.getTime() + JUNIOR_TIMER_SAFETY.inactivityGraceMs,
  );

  if (now.getTime() >= graceDeadline.getTime()) {
    return {
      action: "stop",
      stopReason: "inactivity_timeout",
      endedAt: inactivityCutoff,
      lastActivityAt,
      automaticStopAt: now,
    };
  }

  return { action: "none" };
}

export function shouldShowInactivityWarning(args: {
  startedAt: string | Date;
  lastActivityAt?: string | Date | null;
  now?: Date;
}): boolean {
  const now = args.now ?? new Date();
  const lastActivityAt = resolveLastActivityAt({
    lastActivityAt: args.lastActivityAt,
    startedAt: args.startedAt,
  });
  const warningAt = lastActivityAt.getTime() + JUNIOR_TIMER_SAFETY.inactivityWarningMs;
  const graceEnd =
    warningAt + JUNIOR_TIMER_SAFETY.inactivityGraceMs;
  return now.getTime() >= warningAt && now.getTime() < graceEnd;
}

export function isHeartbeatTooSoon(
  previousLastActivityAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!previousLastActivityAt) return false;
  const prev = new Date(previousLastActivityAt);
  if (Number.isNaN(prev.getTime())) return false;
  return now.getTime() - prev.getTime() < JUNIOR_TIMER_SAFETY.heartbeatMinIntervalMs;
}

export function stopReasonLabel(reason: string | null | undefined): string {
  switch (reason) {
    case "manual":
      return "Manual stop";
    case "admin_correction":
      return "Admin correction";
    case "inactivity_timeout":
      return "Auto-stopped (inactivity)";
    case "max_shift_timeout":
      return "Auto-stopped (max shift)";
    case "system_recovery":
      return "System recovery";
    default:
      return reason?.trim() ? reason : "—";
  }
}
