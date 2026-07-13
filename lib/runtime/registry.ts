/**
 * Phase 30B — Runtime adapter registry.
 * Single active adapter; no global application state dump.
 */

import type { KxdRuntimeAdapter } from "./adapter";
import { runtimeFail, runtimeOk, type KxdRuntimeResult } from "./errors";

let activeAdapter: KxdRuntimeAdapter | null = null;

export function registerRuntimeAdapter(adapter: KxdRuntimeAdapter): void {
  activeAdapter = adapter;
}

export function getRuntimeAdapter(): KxdRuntimeAdapter | null {
  return activeAdapter;
}

export function requireRuntimeAdapter(): KxdRuntimeResult<KxdRuntimeAdapter> {
  if (!activeAdapter) {
    return runtimeFail(
      "not-initialized",
      "Runtime adapter is not registered. Call initializeRuntime() first.",
    );
  }
  return runtimeOk(activeAdapter);
}

export function clearRuntimeAdapter(): void {
  activeAdapter = null;
}
