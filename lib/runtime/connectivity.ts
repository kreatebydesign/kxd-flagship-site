/**
 * Phase 30B — Connectivity model (Edition 1 → L1 Offline Awareness).
 *
 * Signals vs proof:
 * - `navigator.onLine` is a signal, never proof the canonical backend is reachable.
 * - `unknown` must not masquerade as online.
 * - `degraded` = browser thinks online but server reachability failed.
 *
 * Mutation policy (Edition 1):
 * - Never claim offline mutation support. No mutation queue.
 * - `mayAttemptBusinessMutation`: local UI may *attempt* when status is
 *   `online` or `unknown`. The authenticated remote server remains the authority
 *   and may accept or reject. This avoids blocking SSR/hydration (`unknown`)
 *   while still forbidding attempts when we know we are offline/degraded/reconnecting.
 * - `mayMutateBusinessState`: stricter UI gate — only when status is `online`
 *   (still not proof; prefer disabling destructive actions when offline/degraded).
 */

import type { KxdConnectivityStatus } from "./events";

export type { KxdConnectivityStatus };

export type ConnectivitySnapshot = {
  status: KxdConnectivityStatus;
  at: string;
  /** navigator.onLine when available; null in non-browser probes. */
  navigatorOnline: boolean | null;
};

/**
 * Map environment signals to a connectivity status.
 * Explicit inputs — do not invent "online" when unknown.
 */
export function resolveConnectivity(input: {
  navigatorOnline?: boolean | null;
  serverReachable?: boolean | null;
  reconnecting?: boolean;
}): KxdConnectivityStatus {
  if (input.reconnecting) return "reconnecting";

  if (input.navigatorOnline === false) return "offline";

  if (input.serverReachable === false) {
    // Browser thinks online but canonical backend unreachable.
    return input.navigatorOnline === true ? "degraded" : "offline";
  }

  if (input.serverReachable === true) return "online";

  if (input.navigatorOnline === true) return "online";

  return "unknown";
}

export function detectBrowserConnectivity(): ConnectivitySnapshot {
  const at = new Date().toISOString();
  if (typeof navigator === "undefined") {
    return { status: "unknown", at, navigatorOnline: null };
  }
  const navigatorOnline = navigator.onLine;
  return {
    status: resolveConnectivity({ navigatorOnline }),
    at,
    navigatorOnline,
  };
}

/**
 * Strict UI gate: treat only `online` as comfortable for mutation UX.
 * Still not server proof — use for banners / disabling offline-sensitive controls.
 */
export function mayMutateBusinessState(
  status: KxdConnectivityStatus,
): boolean {
  return status === "online";
}

/**
 * Whether the client may *attempt* a mutation against the canonical remote API.
 * Server authentication and validation remain authoritative.
 * Forbidden when we know the network path is broken.
 */
export function mayAttemptBusinessMutation(
  status: KxdConnectivityStatus,
): boolean {
  return status === "online" || status === "unknown";
}
