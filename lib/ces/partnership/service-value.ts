import {
  getServiceCapability,
  type ServiceCapabilityDefinition,
  type ServiceCapabilityId,
  type ResolvedServiceScope,
} from "@/lib/service-capabilities";
import type { PartnershipServiceSummary } from "./types";

const CLIENT_CAPABILITY_COPY: Partial<
  Record<ServiceCapabilityId, { label: string; summary: string }>
> = {
  managed_website: {
    label: "Website Management",
    summary: "Website care, updates, and day-to-day partnership support.",
  },
  seo_visibility: {
    label: "Search Visibility",
    summary: "Search presence and visibility monitoring.",
  },
  analytics_reporting: {
    label: "Analytics & Performance Reporting",
    summary: "Website and search performance reporting for this partnership.",
  },
  hosting_infrastructure: {
    label: "Website hosting & care",
    summary: "Hosting, monitoring, and day-to-day website care.",
  },
  lead_conversion: {
    label: "Lead capture & inquiries",
    summary: "Landing pages, inquiry forms, and request flow.",
  },
  inventory_experience: {
    label: "Inventory / Showroom Management",
    summary: "Vehicle listings and public showroom presentation.",
  },
};

export function clientServiceCapabilityCopy(
  capability: ServiceCapabilityDefinition,
): { label: string; summary: string } {
  return CLIENT_CAPABILITY_COPY[capability.id] ?? {
    label: capability.label,
    summary: capability.summary,
  };
}

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
    .map((capability, index) => {
      const copy = clientServiceCapabilityCopy(capability);
      return {
        id: `active-service-${index + 1}`,
        label: copy.label,
        value: copy.summary,
      };
    });

  return {
    relationshipLabel: scope.relationshipLabel,
    items,
  };
}
