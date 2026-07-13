/**
 * Phase 30B — Capability helpers.
 * Support is probed explicitly; never inferred solely from runtime kind.
 */

import type {
  KxdCapabilityId,
  KxdCapabilityState,
  KxdCapabilitySupport,
  KxdRuntimeCapabilities,
  KxdRuntimeKind,
} from "./types";
import { KXD_CAPABILITY_IDS } from "./types";

export function capabilityState(
  id: KxdCapabilityId,
  support: KxdCapabilitySupport,
  permissionGranted: boolean | null = null,
  detail?: string,
): KxdCapabilityState {
  return { id, support, permissionGranted, detail };
}

export function allUnsupported(
  detail = "Not probed",
): KxdRuntimeCapabilities {
  const entries = KXD_CAPABILITY_IDS.map((id) => [
    id,
    capabilityState(id, "unsupported", null, detail),
  ] as const);
  return Object.fromEntries(entries) as KxdRuntimeCapabilities;
}

/**
 * Baseline expectations by kind — informational only.
 * Actual adapter must still probe and overwrite.
 */
export function expectedCapabilitiesForKind(
  kind: KxdRuntimeKind,
): Partial<Record<KxdCapabilityId, KxdCapabilitySupport>> {
  if (kind === "web") {
    return {
      "open-external-url": "supported",
      download: "supported",
      "save-file": "supported",
      "open-file": "supported",
      clipboard: "requires-permission",
      notifications: "requires-permission",
      theme: "supported",
      "application-badge": "requires-permission",
      "secure-storage": "unsupported",
      "reveal-file": "unsupported",
      "native-menu": "unsupported",
      updater: "unsupported",
      "deep-links": "unsupported",
      "background-execution": "unsupported",
      filesystem: "unsupported",
      "biometric-authentication": "unsupported",
      "operating-system-information": "supported",
    };
  }

  // Future desktop — still must be probed by native adapter.
  return {
    "open-external-url": "supported",
    download: "supported",
    "save-file": "supported",
    "open-file": "supported",
    clipboard: "supported",
    notifications: "requires-permission",
    theme: "supported",
    "application-badge": "supported",
    "secure-storage": "supported",
    "reveal-file": "supported",
    "native-menu": "supported",
    updater: "supported",
    "deep-links": "supported",
    "background-execution": "requires-permission",
    filesystem: "requires-permission",
    "biometric-authentication": "requires-permission",
    "operating-system-information": "supported",
  };
}

export function isCapabilityUsable(
  caps: KxdRuntimeCapabilities,
  id: KxdCapabilityId,
): boolean {
  const state = caps[id];
  if (!state) return false;
  if (state.support === "unsupported" || state.support === "unknown") return false;
  if (state.support === "requires-permission" && state.permissionGranted !== true) {
    return false;
  }
  return state.support === "supported" || state.permissionGranted === true;
}
