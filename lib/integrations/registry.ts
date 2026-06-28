import type { IntegrationProviderDefinition, IntegrationProviderId } from "./types";

const registry = new Map<IntegrationProviderId, IntegrationProviderDefinition>();

export function registerIntegrationProvider(definition: IntegrationProviderDefinition): void {
  registry.set(definition.id, definition);
}

export function getIntegrationProvider(id: IntegrationProviderId): IntegrationProviderDefinition | undefined {
  return registry.get(id);
}

export function getAllIntegrationProviders(): IntegrationProviderDefinition[] {
  return Array.from(registry.values()).sort((a, b) => a.connectPriority - b.connectPriority);
}

export function getIntegrationProviderIds(): IntegrationProviderId[] {
  return getAllIntegrationProviders().map((p) => p.id);
}

export function isProviderRegistered(id: string): boolean {
  return registry.has(id as IntegrationProviderId);
}

export function clearIntegrationRegistry(): void {
  registry.clear();
}
