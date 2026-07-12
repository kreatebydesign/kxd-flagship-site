/**
 * Phase 25D — Buffer expansion around busy / protected blocks.
 */

import { toIso } from "./time";
import type {
  AvailabilityBufferConfig,
  NormalizedBusyBlock,
} from "./types";
import { DEFAULT_AVAILABILITY_BUFFERS } from "./types";

export function resolveBuffers(
  partial?: Partial<AvailabilityBufferConfig>,
): AvailabilityBufferConfig {
  return {
    preEventMinutes:
      partial?.preEventMinutes ?? DEFAULT_AVAILABILITY_BUFFERS.preEventMinutes,
    postEventMinutes:
      partial?.postEventMinutes ?? DEFAULT_AVAILABILITY_BUFFERS.postEventMinutes,
    minimumTransitionMinutes:
      partial?.minimumTransitionMinutes ??
      DEFAULT_AVAILABILITY_BUFFERS.minimumTransitionMinutes,
    focusProtectionMinutes:
      partial?.focusProtectionMinutes ??
      DEFAULT_AVAILABILITY_BUFFERS.focusProtectionMinutes,
  };
}

/** Expand busy blocks by pre/post/focus/transition buffers. */
export function applyBuffersToBusy(
  busy: NormalizedBusyBlock[],
  buffers: AvailabilityBufferConfig,
): NormalizedBusyBlock[] {
  const pre =
    (buffers.preEventMinutes +
      buffers.focusProtectionMinutes +
      buffers.minimumTransitionMinutes) *
    60_000;
  const post =
    (buffers.postEventMinutes +
      buffers.focusProtectionMinutes +
      buffers.minimumTransitionMinutes) *
    60_000;

  return busy
    .map((b) => {
      const startMs = b.startMs - pre;
      const endMs = b.endMs + post;
      return {
        startMs,
        endMs,
        start: toIso(startMs),
        end: toIso(endMs),
      };
    })
    .sort((a, b) => a.startMs - b.startMs);
}
