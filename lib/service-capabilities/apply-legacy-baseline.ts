/**
 * Operator-authorized legacy baseline capability assignments.
 *
 * For clients whose operational scope predates structured Contracts and cannot
 * be inferred from engagement text. This is NOT commercial authority and must
 * never fabricate contract evidence, pricing, obligations, or portal grants.
 *
 * Provenance reuses existing assignment fields:
 * - source: legacy-manual
 * - relatedContract: omitted
 * - drivesExperience: false
 * - note: legacy-baseline prefix + actor + reason
 * - effectiveAt / createdAt / updatedAt: Payload timestamps
 */
import "server-only";

import { activateClientService } from "./assignments";
import { isServiceCapabilityId } from "./catalog";
import {
  buildLegacyBaselineNote,
  LEGACY_BASELINE_NOTE_PREFIX,
} from "./legacy-baseline";
import type { ClientServiceAssignmentRecord, ServiceCapabilityId } from "./types";

export {
  buildLegacyBaselineNote,
  isLegacyBaselineNote,
  LEGACY_BASELINE_NOTE_PREFIX,
} from "./legacy-baseline";

export type ApplyLegacyBaselineResult = {
  clientId: number;
  applied: ClientServiceAssignmentRecord[];
  skipped: Array<{ capabilityId: string; reason: string }>;
  provenance: {
    source: "legacy-manual";
    drivesExperience: false;
    relatedContractId: null;
    actor: string;
    reason: string;
    notePrefix: typeof LEGACY_BASELINE_NOTE_PREFIX;
  };
};

/**
 * Explicitly establish baseline capabilities for a legacy relationship.
 * Operator must supply capability ids + reason. Never invents contract evidence.
 */
export async function applyLegacyBaselineCapabilities(input: {
  clientId: number;
  capabilityIds: readonly ServiceCapabilityId[];
  actor: string;
  reason: string;
}): Promise<ApplyLegacyBaselineResult> {
  const actor = input.actor.trim();
  const reason = input.reason.trim();
  if (!actor) {
    throw new Error("Legacy baseline requires an operator actor.");
  }
  if (!reason) {
    throw new Error("Legacy baseline requires an explicit operator reason.");
  }
  if (!Number.isFinite(input.clientId) || input.clientId <= 0) {
    throw new Error("Legacy baseline requires a valid client id.");
  }
  if (!input.capabilityIds.length) {
    throw new Error("Select at least one capability for legacy baseline.");
  }

  const applied: ClientServiceAssignmentRecord[] = [];
  const skipped: ApplyLegacyBaselineResult["skipped"] = [];
  const uniqueIds = [...new Set(input.capabilityIds)];

  for (const capabilityId of uniqueIds) {
    if (!isServiceCapabilityId(capabilityId)) {
      skipped.push({ capabilityId: String(capabilityId), reason: "Unknown capability." });
      continue;
    }
    const assignment = await activateClientService({
      clientId: input.clientId,
      capabilityId,
      source: "legacy-manual",
      relatedContractId: null,
      drivesExperience: false,
      note: buildLegacyBaselineNote({
        capabilityId,
        actor,
        reason,
      }),
    });
    applied.push(assignment);
  }

  return {
    clientId: input.clientId,
    applied,
    skipped,
    provenance: {
      source: "legacy-manual",
      drivesExperience: false,
      relatedContractId: null,
      actor,
      reason,
      notePrefix: LEGACY_BASELINE_NOTE_PREFIX,
    },
  };
}
