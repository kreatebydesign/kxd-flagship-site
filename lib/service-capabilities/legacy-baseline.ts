/**
 * Pure helpers for operator-authorized legacy baseline provenance.
 * No DB / Payload imports — safe for verify scripts.
 */
import type { ServiceCapabilityId } from "./types";

export const LEGACY_BASELINE_NOTE_PREFIX = "legacy-baseline:";

export function buildLegacyBaselineNote(input: {
  capabilityId: ServiceCapabilityId;
  actor: string;
  reason: string;
}): string {
  const actor = input.actor.trim() || "operator";
  const reason = input.reason.trim().replace(/\s+/g, " ");
  return `${LEGACY_BASELINE_NOTE_PREFIX} capability=${input.capabilityId}; actor=${actor}; reason=${reason}`.slice(
    0,
    900,
  );
}

export function isLegacyBaselineNote(note: string | null | undefined): boolean {
  return typeof note === "string" && note.trim().startsWith(LEGACY_BASELINE_NOTE_PREFIX);
}
