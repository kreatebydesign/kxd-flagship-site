/**
 * Phase 30B — Typed runtime event contract.
 * Prefer this over raw window CustomEvent for runtime-level signals.
 * Existing product CustomEvents (command palette, etc.) migrate later.
 */

export type KxdConnectivityStatus =
  | "online"
  | "offline"
  | "reconnecting"
  | "degraded"
  | "unknown";

export type KxdRuntimeEventMap = {
  "runtime-ready": {
    kind: string;
    contractVersion: string;
    at: string;
  };
  "runtime-capabilities-changed": {
    at: string;
    changed: string[];
  };
  "deep-link": {
    raw: string;
    path: string;
    at: string;
  };
  update: {
    status: "available" | "downloading" | "ready" | "error" | "idle";
    version?: string;
    message?: string;
    at: string;
  };
  notification: {
    id: string;
    title: string;
    body?: string;
    href?: string;
    at: string;
  };
  connectivity: {
    status: KxdConnectivityStatus;
    at: string;
  };
  theme: {
    scheme: "light" | "dark" | "unknown";
    at: string;
  };
  timezone: {
    timeZone: string;
    source: string;
    at: string;
  };
};

export type KxdRuntimeEventName = keyof KxdRuntimeEventMap;

export type KxdRuntimeEventListener<E extends KxdRuntimeEventName> = (
  payload: KxdRuntimeEventMap[E],
) => void;

type ListenerEntry = {
  name: KxdRuntimeEventName;
  fn: (payload: unknown) => void;
};

/**
 * In-process typed bus. Not multi-window safe (future shell mediates).
 */
export class KxdRuntimeEventBus {
  private listeners: ListenerEntry[] = [];

  on<E extends KxdRuntimeEventName>(
    name: E,
    listener: KxdRuntimeEventListener<E>,
  ): () => void {
    const entry: ListenerEntry = {
      name,
      fn: listener as (payload: unknown) => void,
    };
    this.listeners.push(entry);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== entry);
    };
  }

  emit<E extends KxdRuntimeEventName>(
    name: E,
    payload: KxdRuntimeEventMap[E],
  ): void {
    for (const entry of this.listeners) {
      if (entry.name === name) {
        entry.fn(payload);
      }
    }
  }

  clear(): void {
    this.listeners = [];
  }
}

export const runtimeEvents = new KxdRuntimeEventBus();
