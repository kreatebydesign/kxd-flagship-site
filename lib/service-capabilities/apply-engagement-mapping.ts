/**
 * Apply operator-approved engagement → capability mappings.
 * Never mutates pricing, obligations, paymentEvents, or accepted snapshots.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { activateClientService, loadResolvedServiceScope } from "./assignments";
import {
  buildBridgeAssignmentNote,
  proposeCapabilitiesFromEngagement,
  type EngagementCapabilityProposal,
  type ProposedCapabilityMapping,
} from "./propose-from-engagement";
import type { ClientServiceAssignmentRecord, ServiceCapabilityId } from "./types";
import { isServiceCapabilityId } from "./catalog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function loadEngagementCapabilityProposal(
  clientId: number,
): Promise<EngagementCapabilityProposal> {
  const payload = await getPayload({ config });
  const client = (await payload.findByID({
    collection: "clients",
    id: clientId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  const contracts = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "contracts" as any,
    where: { client: { equals: clientId } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
    sort: "-updatedAt",
  });
  const scope = await loadResolvedServiceScope(clientId);
  return proposeCapabilitiesFromEngagement({
    clientId,
    contracts: (contracts.docs as AnyDoc[]).map((doc) => ({
      id: Number(doc.id),
      lifecyclePackage: doc.lifecyclePackage,
      title: doc.title,
      projectName: doc.projectName,
    })),
    commercialNotes:
      typeof client.commercialNotes === "string" ? client.commercialNotes : null,
    relationshipLabel:
      typeof client.commercialRelationshipLabel === "string"
        ? client.commercialRelationshipLabel
        : null,
    activeCapabilityIds: scope.activeCapabilityIds,
  });
}

export type ApplyEngagementMappingResult = {
  clientId: number;
  applied: ClientServiceAssignmentRecord[];
  skipped: Array<{ capabilityId: string; reason: string }>;
  proposal: EngagementCapabilityProposal;
};

/**
 * Apply operator-selected capability ids from a previously proposed set.
 * Rejects unknown ids and refuses to invent capabilities not in the proposal
 * unless allowManual is true (manual catalog activate stays on the other route).
 */
export async function applyEngagementCapabilityMapping(input: {
  clientId: number;
  capabilityIds: readonly ServiceCapabilityId[];
  actor?: string | null;
}): Promise<ApplyEngagementMappingResult> {
  const proposal = await loadEngagementCapabilityProposal(input.clientId);
  const byId = new Map(proposal.proposals.map((row) => [row.capabilityId, row]));
  const applied: ClientServiceAssignmentRecord[] = [];
  const skipped: ApplyEngagementMappingResult["skipped"] = [];

  const uniqueIds = [...new Set(input.capabilityIds)];
  for (const capabilityId of uniqueIds) {
    if (!isServiceCapabilityId(capabilityId)) {
      skipped.push({ capabilityId: String(capabilityId), reason: "Unknown capability." });
      continue;
    }
    const row = byId.get(capabilityId);
    if (!row) {
      skipped.push({
        capabilityId,
        reason: "Not present in current engagement proposal — refuse to invent.",
      });
      continue;
    }
    const assignment = await activateClientService({
      clientId: input.clientId,
      capabilityId,
      source: row.suggestedSource,
      relatedContractId: row.relatedContractId,
      drivesExperience: false,
      note: buildBridgeAssignmentNote({
        capabilityId,
        rationale: row.rationale,
        evidence: row.evidence,
      }),
    });
    applied.push(assignment);
  }

  // Re-load proposal after apply for caller transparency.
  const refreshed = await loadEngagementCapabilityProposal(input.clientId);
  return {
    clientId: input.clientId,
    applied,
    skipped,
    proposal: refreshed,
  };
}

export function selectHighConfidenceIds(
  proposal: EngagementCapabilityProposal,
): ServiceCapabilityId[] {
  return proposal.proposals
    .filter((row) => row.confidence === "high")
    .map((row) => row.capabilityId);
}

export type { ProposedCapabilityMapping };
