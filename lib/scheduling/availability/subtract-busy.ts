/**
 * Phase 25D — Subtract buffered busy from working windows.
 */

import { toIso } from "./time";
import type { NormalizedBusyBlock, NormalizedTimeWindow } from "./types";
import { normalizeBusyBlocks } from "./normalize";

/**
 * Return free windows = working windows − busy (already buffered/merged preferred).
 */
export function subtractBusyFromWindows(
  working: NormalizedTimeWindow[],
  busy: NormalizedBusyBlock[],
): NormalizedTimeWindow[] {
  const mergedBusy = normalizeBusyBlocks(
    busy.map((b) => ({ start: b.start, end: b.end })),
  );

  const free: NormalizedTimeWindow[] = [];

  for (const win of working) {
    let cursor = win.startMs;
    const relevant = mergedBusy.filter(
      (b) => b.endMs > win.startMs && b.startMs < win.endMs,
    );

    for (const block of relevant) {
      const busyStart = Math.max(block.startMs, win.startMs);
      const busyEnd = Math.min(block.endMs, win.endMs);
      if (busyStart > cursor) {
        free.push({
          startMs: cursor,
          endMs: busyStart,
          start: toIso(cursor),
          end: toIso(busyStart),
        });
      }
      cursor = Math.max(cursor, busyEnd);
    }

    if (cursor < win.endMs) {
      free.push({
        startMs: cursor,
        endMs: win.endMs,
        start: toIso(cursor),
        end: toIso(win.endMs),
      });
    }
  }

  return free.filter((w) => w.endMs > w.startMs);
}
