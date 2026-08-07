/**
 * Server-side auto-stop for stale / max-length Junior Creator shifts.
 * Idempotent + concurrency-safe via FOR UPDATE locks.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  correctionAuditEntry,
  existingCorrectionAudit,
  shiftMoneyState,
} from "./shift-correction-audit";
import { withJuniorShiftCorrectionTransaction } from "./shift-correction-transaction";
import {
  decideAutoStop,
  JUNIOR_TIMER_SAFETY,
  type JuniorShiftStopReason,
} from "./timer-safety";
import { minutesBetween } from "./week";
type AnyDoc = Record<string, any>;

export type SafetyStopResult =
  | {
      outcome: "stopped";
      id: number;
      stopReason: JuniorShiftStopReason;
      endedAt: string;
      totalMinutes: number;
      lastActivityAt: string;
      automaticStopAt: string;
    }
  | {
      outcome: "already_stopped";
      id: number;
      status: string;
      stopReason: string | null;
      endedAt: string | null;
      totalMinutes: number;
    }
  | { outcome: "not_due"; id: number }
  | { outcome: "not_found"; id: number };

const SYSTEM_ADMIN = {
  id: "timer-safety",
  email: null,
  collection: "system",
};

function auditMeta(args: {
  stopReason: JuniorShiftStopReason;
  lastActivityAt: string;
  automaticStopAt: string;
  source: string;
}) {
  return {
    stopReason: args.stopReason,
    stoppedBy: args.source,
    lastActivityAt: args.lastActivityAt,
    inactivityThresholdMinutes: JUNIOR_TIMER_SAFETY.inactivityWarningMs / 60000,
    inactivityGraceMinutes: JUNIOR_TIMER_SAFETY.inactivityGraceMs / 60000,
    maxShiftMinutes: JUNIOR_TIMER_SAFETY.maxShiftMs / 60000,
    automaticStopAt: args.automaticStopAt,
  };
}

async function loadShift(
  payload: Awaited<ReturnType<typeof getPayload>>,
  shiftId: number,
  req?: any,
): Promise<AnyDoc | null> {
  try {
    return (await payload.findByID({
      collection: "junior-creator-shifts" as any,
      id: shiftId,
      depth: 0,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })) as AnyDoc;
  } catch {
    return null;
  }
}

/**
 * Auto-stop a single active shift when safety thresholds are exceeded.
 * Safe to call concurrently — losers see already_stopped / not_due.
 */
export async function autoStopShiftIfDue(args: {
  shiftId: number;
  source: string;
  now?: Date;
  /** When set, only stop if the shift belongs to this junior. */
  requireJuniorId?: number;
}): Promise<SafetyStopResult> {
  const payload = await getPayload({ config });
  const now = args.now ?? new Date();

  const pre = await loadShift(payload, args.shiftId);
  if (!pre) return { outcome: "not_found", id: args.shiftId };

  if (args.requireJuniorId != null) {
    const owner = Number(
      typeof pre.juniorCreatorUser === "object" && pre.juniorCreatorUser
        ? pre.juniorCreatorUser.id
        : pre.juniorCreatorUser,
    );
    if (owner !== args.requireJuniorId) {
      return { outcome: "not_found", id: args.shiftId };
    }
  }

  if (String(pre.status ?? "") !== "active") {
    return {
      outcome: "already_stopped",
      id: Number(pre.id),
      status: String(pre.status ?? ""),
      stopReason: pre.stopReason ? String(pre.stopReason) : null,
      endedAt: pre.endedAt ? String(pre.endedAt) : null,
      totalMinutes: Number(pre.totalMinutes ?? 0),
    };
  }

  const decision = decideAutoStop({
    startedAt: pre.startedAt,
    lastActivityAt: pre.lastActivityAt,
    now,
  });
  if (decision.action !== "stop") {
    return { outcome: "not_due", id: Number(pre.id) };
  }

  let result: SafetyStopResult = { outcome: "not_due", id: Number(pre.id) };

  await withJuniorShiftCorrectionTransaction(payload, [args.shiftId], async (txReq) => {
    const locked = await loadShift(payload, args.shiftId, txReq);
    if (!locked) {
      result = { outcome: "not_found", id: args.shiftId };
      return;
    }

    if (String(locked.status ?? "") !== "active") {
      result = {
        outcome: "already_stopped",
        id: Number(locked.id),
        status: String(locked.status ?? ""),
        stopReason: locked.stopReason ? String(locked.stopReason) : null,
        endedAt: locked.endedAt ? String(locked.endedAt) : null,
        totalMinutes: Number(locked.totalMinutes ?? 0),
      };
      return;
    }

    const lockedDecision = decideAutoStop({
      startedAt: locked.startedAt,
      lastActivityAt: locked.lastActivityAt,
      now,
    });
    if (lockedDecision.action !== "stop") {
      result = { outcome: "not_due", id: Number(locked.id) };
      return;
    }

    const startedAt = new Date(locked.startedAt);
    const endedAt = lockedDecision.endedAt;
    const totalMinutes = Math.max(0, minutesBetween(startedAt, endedAt));
    const lastActivityAtIso = lockedDecision.lastActivityAt.toISOString();
    const automaticStopAtIso = lockedDecision.automaticStopAt.toISOString();
    const endedAtIso = endedAt.toISOString();

    const updateData: Record<string, unknown> = {
      status: "completed",
      endedAt: endedAtIso,
      totalMinutes,
      lastActivityAt: lastActivityAtIso,
      stopReason: lockedDecision.stopReason,
      automaticStopAt: automaticStopAtIso,
      notes:
        typeof locked.notes === "string" && locked.notes.trim()
          ? `${locked.notes.trim()}\n\n[Timer safety ${automaticStopAtIso.slice(0, 10)}] ${lockedDecision.stopReason}`
          : `[Timer safety ${automaticStopAtIso.slice(0, 10)}] ${lockedDecision.stopReason}`,
    };

    const original = shiftMoneyState(locked);
    const corrected = shiftMoneyState({ ...locked, ...updateData })!;
    updateData.correctionAudit = [
      ...existingCorrectionAudit(locked),
      {
        ...correctionAuditEntry({
          action: "timerSafetyAutoStop",
          reason:
            lockedDecision.stopReason === "max_shift_timeout"
              ? "Active shift exceeded max continuous length."
              : "Active shift exceeded inactivity warning + grace without confirmation.",
          admin: SYSTEM_ADMIN,
          original,
          corrected,
          at: automaticStopAtIso,
        }),
        ...auditMeta({
          stopReason: lockedDecision.stopReason,
          lastActivityAt: lastActivityAtIso,
          automaticStopAt: automaticStopAtIso,
          source: args.source,
        }),
      },
    ];

    await payload.update({
      collection: "junior-creator-shifts" as any,
      id: locked.id,
      data: updateData as any,
      overrideAccess: true,
      req: txReq,
    });

    result = {
      outcome: "stopped",
      id: Number(locked.id),
      stopReason: lockedDecision.stopReason,
      endedAt: endedAtIso,
      totalMinutes,
      lastActivityAt: lastActivityAtIso,
      automaticStopAt: automaticStopAtIso,
    };
  });

  return result;
}

/**
 * Sweep all active junior shifts and auto-stop any that are due.
 */
export async function sweepStaleJuniorShifts(args?: {
  source?: string;
  now?: Date;
  limit?: number;
}): Promise<{
  examined: number;
  stopped: SafetyStopResult[];
  alreadyStopped: number;
  notDue: number;
}> {
  const opts = args ?? {};
  const payload = await getPayload({ config });
  const now = opts.now ?? new Date();
  const source = opts.source ?? "cron:junior-creator-shift-safety";

  const active = await payload.find({
    collection: "junior-creator-shifts" as any,
    where: { status: { equals: "active" } },
    limit: opts.limit ?? 100,
    depth: 0,
    overrideAccess: true,
  });

  const stopped: SafetyStopResult[] = [];
  let alreadyStopped = 0;
  let notDue = 0;

  for (const doc of active.docs as AnyDoc[]) {
    const result = await autoStopShiftIfDue({
      shiftId: Number(doc.id),
      source,
      now,
    });
    if (result.outcome === "stopped") stopped.push(result);
    else if (result.outcome === "already_stopped") alreadyStopped += 1;
    else if (result.outcome === "not_due") notDue += 1;
  }

  return {
    examined: active.docs.length,
    stopped,
    alreadyStopped,
    notDue,
  };
}
