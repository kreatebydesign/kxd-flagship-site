import type { IntegrationConnectionStatus, IntegrationProviderView } from "./types";

export function groupProvidersByStatus(
  providers: IntegrationProviderView[],
): Record<IntegrationConnectionStatus, IntegrationProviderView[]> {
  const groups: Record<IntegrationConnectionStatus, IntegrationProviderView[]> = {
    connected: [],
    not_connected: [],
    configuration_required: [],
    disabled: [],
    error: [],
    unknown: [],
  };

  for (const provider of providers) {
    groups[provider.status].push(provider);
  }

  return groups;
}

export function countByStatus(
  providers: IntegrationProviderView[],
): Record<IntegrationConnectionStatus, number> {
  const grouped = groupProvidersByStatus(providers);
  return {
    connected: grouped.connected.length,
    not_connected: grouped.not_connected.length,
    configuration_required: grouped.configuration_required.length,
    disabled: grouped.disabled.length,
    error: grouped.error.length,
    unknown: grouped.unknown.length,
  };
}
