/**
 * Client HQ module registry — adapter over the canonical CES capability catalog.
 * Edition framework still controls platform-level visibility.
 */

import {
  CLIENT_HQ_PORTAL_MODULE_IDS,
  getCanonicalCapability,
  type ClientHqPortalModuleId,
} from "@/lib/ces/modules/canonical";
import { isModuleEnabled } from "@/lib/editions";

export type ClientHqModuleId = ClientHqPortalModuleId;

export interface ClientHqModuleConfig {
  id: ClientHqModuleId;
  enabled: boolean;
  label: string;
}

export const CLIENT_HQ_MODULE_LABELS: Record<ClientHqModuleId, string> =
  Object.fromEntries(
    CLIENT_HQ_PORTAL_MODULE_IDS.map((id) => [
      id,
      getCanonicalCapability(id)?.label ?? id,
    ]),
  ) as Record<ClientHqModuleId, string>;

/** Default Client HQ module set — edition-aware, derived from canonical ids. */
export const CLIENT_HQ_MODULES: Record<ClientHqModuleId, ClientHqModuleConfig> =
  Object.fromEntries(
    CLIENT_HQ_PORTAL_MODULE_IDS.map((id) => [
      id,
      {
        id,
        enabled: true,
        label: CLIENT_HQ_MODULE_LABELS[id],
      },
    ]),
  ) as Record<ClientHqModuleId, ClientHqModuleConfig>;

export function isClientHqModuleEnabled(moduleId: ClientHqModuleId): boolean {
  const editionModule = getCanonicalCapability(moduleId)?.editionModule;
  if (!editionModule) return true;
  return isModuleEnabled(editionModule);
}

export function getClientHqModuleLabel(moduleId: ClientHqModuleId): string {
  return CLIENT_HQ_MODULE_LABELS[moduleId] ?? moduleId;
}
