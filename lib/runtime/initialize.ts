/**
 * Phase 30B — Runtime initialization entrypoints.
 *
 * Always boots the web adapter unless a caller injects a native adapter.
 * Spoofed `window.__KXD_NATIVE_BRIDGE__` cannot select a desktop adapter.
 */

import type { KxdRuntimeAdapter } from "./adapter";
import { WebRuntimeAdapter } from "./adapters/web";
import type { KxdRuntimeResult } from "./errors";
import {
  clearRuntimeAdapter,
  getRuntimeAdapter,
  registerRuntimeAdapter,
} from "./registry";
import type { KxdRuntimeInfo } from "./types";

export type InitializeRuntimeOptions = {
  /** Inject a custom adapter (tests / future native). Default: web. */
  adapter?: KxdRuntimeAdapter;
};

/**
 * Initialize the active runtime adapter.
 * Does not request permissions. Does not trust user-agent or globals for kind.
 */
export async function initializeRuntime(
  options: InitializeRuntimeOptions = {},
): Promise<KxdRuntimeResult<KxdRuntimeInfo>> {
  if (options.adapter) {
    registerRuntimeAdapter(options.adapter);
    return options.adapter.initialize();
  }

  const adapter = new WebRuntimeAdapter();
  registerRuntimeAdapter(adapter);
  return adapter.initialize();
}

export function getInitializedRuntime(): KxdRuntimeAdapter | null {
  return getRuntimeAdapter();
}

export function resetRuntime(): void {
  clearRuntimeAdapter();
}
