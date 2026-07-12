/**
 * Phase 25E — Synthetic fixtures for permanent availability regression.
 */

import { toIso, zonedWallTimeToUtcMs } from "../time";
import type { NormalizedBusyBlock } from "../types";
import { normalizeBusyBlocks } from "../normalize";

export const VALIDATION_TZ = "America/Los_Angeles";

/** Fixed Monday 2026-07-13 (PDT). */
export function mondayRange(): { start: string; end: string } {
  return {
    start: toIso(zonedWallTimeToUtcMs(2026, 7, 13, 9, 0, VALIDATION_TZ)),
    end: toIso(zonedWallTimeToUtcMs(2026, 7, 13, 17, 0, VALIDATION_TZ)),
  };
}

export function wall(
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number,
): string {
  return toIso(zonedWallTimeToUtcMs(y, m, d, hour, minute, VALIDATION_TZ));
}

export function busy(
  blocks: Array<{ start: string; end: string }>,
  range?: { start: string; end: string },
): NormalizedBusyBlock[] {
  return normalizeBusyBlocks(blocks, range
    ? {
        rangeStartMs: Date.parse(range.start),
        rangeEndMs: Date.parse(range.end),
      }
    : undefined);
}

/** Heavily booked weekday — only short gaps remain. */
export function meetingHeavyBusy(): NormalizedBusyBlock[] {
  const range = mondayRange();
  return busy(
    [
      { start: wall(2026, 7, 13, 9, 0), end: wall(2026, 7, 13, 10, 0) },
      { start: wall(2026, 7, 13, 10, 15), end: wall(2026, 7, 13, 11, 30) },
      { start: wall(2026, 7, 13, 11, 45), end: wall(2026, 7, 13, 13, 0) },
      { start: wall(2026, 7, 13, 13, 15), end: wall(2026, 7, 13, 14, 30) },
      { start: wall(2026, 7, 13, 14, 45), end: wall(2026, 7, 13, 16, 0) },
      { start: wall(2026, 7, 13, 16, 15), end: wall(2026, 7, 13, 17, 0) },
    ],
    range,
  );
}

/** Fragmented morning with a long afternoon focus window. */
export function longFocusBusy(): NormalizedBusyBlock[] {
  const range = mondayRange();
  return busy(
    [
      { start: wall(2026, 7, 13, 9, 0), end: wall(2026, 7, 13, 9, 30) },
      { start: wall(2026, 7, 13, 10, 0), end: wall(2026, 7, 13, 10, 30) },
      { start: wall(2026, 7, 13, 11, 0), end: wall(2026, 7, 13, 11, 45) },
    ],
    range,
  );
}

/** Fragmented day with many 20-minute gaps. */
export function fragmentedBusy(): NormalizedBusyBlock[] {
  const range = mondayRange();
  const blocks: Array<{ start: string; end: string }> = [];
  for (let h = 9; h < 17; h += 1) {
    blocks.push({
      start: wall(2026, 7, 13, h, 0),
      end: wall(2026, 7, 13, h, 40),
    });
  }
  return busy(blocks, range);
}
