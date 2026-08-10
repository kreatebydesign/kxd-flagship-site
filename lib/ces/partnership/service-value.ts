import { getServiceCapability, type ResolvedServiceScope } from "@/lib/service-capabilities";
import type { PartnershipServiceSummary } from "./types";

/**
 * Client-facing presentation of canonical active services.
 * Commercial assignment metadata and capability IDs never leave this adapter.
 */
export function composePartnershipServiceSummary(
  scope: ResolvedServiceScope,
): PartnershipServiceSummary {
  const items = scope.activeCapabilityIds
    .map((capabilityId) => getServiceCapability(capabilityId))
    .filter((capability): capability is NonNullable<typeof capability> =>
      Boolean(capability?.affectsExperience),
    )
    .map((capability, index) => ({
      id: `active-service-${index + 1}`,
      label: capability.label,
      value: capability.summary,
    }));

  return {
    relationshipLabel: scope.relationshipLabel,
    items,
  };
}
