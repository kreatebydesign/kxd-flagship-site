/**
 * Phase 33A.1 — Scheduled-window identity for idempotent hourly cron.
 */

import type { ReportingProviderId } from "@/lib/reporting/providers/types";
import {
  lastPacificSyncSlotAt,
  nextDailyPacificSyncAt,
} from "./schedule";

export function buildScheduledWindowId(input: {
  clientId: number;
  provider: ReportingProviderId;
  windowAt: Date;
}): string {
  return `${input.clientId}:${input.provider}:${input.windowAt.toISOString()}`;
}

/**
 * Resolve the Pacific scheduled slot the automation is responsible for “now”.
 * Uses nextScheduledSyncAt when present and due; otherwise the latest Pacific slot ≤ now.
 */
export function resolveScheduledWindow(input: {
  clientId: number;
  provider: ReportingProviderId;
  now: Date;
  syncHourPacific: number;
  nextScheduledSyncAt: string | null | undefined;
  force?: boolean;
}): {
  due: boolean;
  windowAt: Date;
  windowId: string;
  reason: string;
} {
  const hour = input.syncHourPacific;
  const slot = lastPacificSyncSlotAt(input.now, hour);

  if (input.force) {
    const windowAt = slot;
    return {
      due: true,
      windowAt,
      windowId: buildScheduledWindowId({
        clientId: input.clientId,
        provider: input.provider,
        windowAt,
      }),
      reason: "force",
    };
  }

  if (input.nextScheduledSyncAt) {
    const next = Date.parse(input.nextScheduledSyncAt);
    if (Number.isFinite(next) && next > input.now.getTime()) {
      return {
        due: false,
        windowAt: new Date(next),
        windowId: buildScheduledWindowId({
          clientId: input.clientId,
          provider: input.provider,
          windowAt: new Date(next),
        }),
        reason: "not-due",
      };
    }
    // Due — prefer the scheduled instant when it aligns to a Pacific hour slot.
    const windowAt = Number.isFinite(next) ? new Date(next) : slot;
    return {
      due: true,
      windowAt,
      windowId: buildScheduledWindowId({
        clientId: input.clientId,
        provider: input.provider,
        windowAt,
      }),
      reason: "scheduled",
    };
  }

  // Uninitialized schedule — eligible immediately against the current Pacific slot.
  return {
    due: true,
    windowAt: slot,
    windowId: buildScheduledWindowId({
      clientId: input.clientId,
      provider: input.provider,
      windowAt: slot,
    }),
    reason: "uninitialized",
  };
}

export function nextSuccessScheduleAt(
  now: Date,
  syncHourPacific: number,
): Date {
  return nextDailyPacificSyncAt(now, syncHourPacific);
}
