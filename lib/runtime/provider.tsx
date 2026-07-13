/**
 * Phase 30B — Smallest runtime provider.
 * Optional React context — not global application state.
 * Portal remains browser-compatible (web adapter).
 *
 * Phase 30C placement (do not wire in 30B):
 * Mount at the narrowest durable Studio shell boundary, e.g.
 * `app/admin/operations/layout.tsx` (client island wrapping children) —
 * NOT `app/layout.tsx`, NOT portal layouts.
 * Preserve server components above the provider. Browser Studio uses the
 * same web adapter path.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { KxdRuntimeAdapter } from "./adapter";
import type { KxdRuntimeCapabilities, KxdRuntimeInfo } from "./types";
import { initializeRuntime, resetRuntime } from "./initialize";
import { getRuntimeAdapter } from "./registry";
import type { KxdConnectivityStatus } from "./events";

export type RuntimeContextValue = {
  ready: boolean;
  info: KxdRuntimeInfo | null;
  capabilities: KxdRuntimeCapabilities | null;
  connectivity: KxdConnectivityStatus;
  adapter: KxdRuntimeAdapter | null;
  error: string | null;
};

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<RuntimeContextValue>({
    ready: false,
    info: null,
    capabilities: null,
    connectivity: "unknown",
    adapter: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await initializeRuntime();
      if (cancelled) return;

      if (!result.ok) {
        setValue({
          ready: false,
          info: null,
          capabilities: null,
          connectivity: "unknown",
          adapter: null,
          error: result.error.message,
        });
        return;
      }

      const adapter = getRuntimeAdapter();
      setValue({
        ready: true,
        info: result.value,
        capabilities: adapter?.getCapabilities() ?? null,
        connectivity: adapter?.getConnectivity() ?? "unknown",
        adapter,
        error: null,
      });
    })();

    return () => {
      cancelled = true;
      resetRuntime();
    };
  }, []);

  return (
    <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
  );
}

/**
 * Optional hook. Returns null outside provider — does not throw.
 * Keeps Portal free to omit the provider entirely.
 */
export function useRuntime(): RuntimeContextValue | null {
  return useContext(RuntimeContext);
}

export function useRuntimeRequired(): RuntimeContextValue {
  const ctx = useContext(RuntimeContext);
  if (!ctx) {
    throw new Error("useRuntimeRequired requires RuntimeProvider");
  }
  return ctx;
}
