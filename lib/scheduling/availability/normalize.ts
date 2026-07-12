/**
 * Phase 25D — Busy-block normalization (sort, merge, clip).
 */

import { toIso, toMs } from "./time";
import type { NormalizedBusyBlock } from "./types";

export interface RawBusyInput {
  start: string;
  end: string;
}

/**
 * Normalize raw busy intervals into sorted, merged, clipped blocks.
 * Drops zero-length and malformed ranges. Merges overlapping and adjacent.
 */
export function normalizeBusyBlocks(
  raw: RawBusyInput[],
  opts?: {
    rangeStartMs?: number;
    rangeEndMs?: number;
    /** Merge blocks that touch or gap ≤ this many ms (default 0 = adjacent). */
    adjacentMergeMs?: number;
  },
): NormalizedBusyBlock[] {
  const adjacentMergeMs = opts?.adjacentMergeMs ?? 0;
  const parsed: Array<{ startMs: number; endMs: number }> = [];

  for (const row of raw) {
    const startMs = Date.parse(row.start);
    const endMs = Date.parse(row.end);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
    if (endMs <= startMs) continue;

    let s = startMs;
    let e = endMs;
    if (opts?.rangeStartMs != null) s = Math.max(s, opts.rangeStartMs);
    if (opts?.rangeEndMs != null) e = Math.min(e, opts.rangeEndMs);
    if (e <= s) continue;
    parsed.push({ startMs: s, endMs: e });
  }

  parsed.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  const merged: Array<{ startMs: number; endMs: number }> = [];
  for (const block of parsed) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...block });
      continue;
    }
    if (block.startMs <= last.endMs + adjacentMergeMs) {
      last.endMs = Math.max(last.endMs, block.endMs);
    } else {
      merged.push({ ...block });
    }
  }

  return merged.map((b) => ({
    startMs: b.startMs,
    endMs: b.endMs,
    start: toIso(b.startMs),
    end: toIso(b.endMs),
  }));
}

export function busyFromProviderBlocks(
  blocks: Array<{ start: string; end: string }>,
  rangeStart: string,
  rangeEnd: string,
): NormalizedBusyBlock[] {
  return normalizeBusyBlocks(blocks, {
    rangeStartMs: toMs(rangeStart),
    rangeEndMs: toMs(rangeEnd),
  });
}
