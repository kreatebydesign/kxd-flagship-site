import type { InventorySourceIdentity } from "./types";

export function normalizeInventorySourceIdentity(
  source: InventorySourceIdentity,
): InventorySourceIdentity | null {
  const sourceSystem = source.sourceSystem.trim().toLowerCase();
  const sourceExternalId = source.sourceExternalId.trim();
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(sourceSystem)) return null;
  if (!sourceExternalId || sourceExternalId.length > 200) return null;
  return { sourceSystem, sourceExternalId };
}
