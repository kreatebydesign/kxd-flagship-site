/**
 * Phase 30B — Runtime detection.
 *
 * Trust model:
 * - Default kind is always `web`.
 * - Query params, cookies, user-agent, and arbitrary globals NEVER grant desktop trust.
 * - `window.__KXD_NATIVE_BRIDGE__` is an untrusted host *hint* only (`hasNativeBridge`).
 * - Desktop kind is established only when a native adapter is explicitly registered
 *   after a real shell handshake (Phase 30C+). Spoofed globals cannot grant capabilities.
 *
 * Hydration: do not read browser globals during SSR. Pass pathname when known.
 */

import { detectNativeBridgeHost } from "./bridge";
import { getRuntimeAdapter } from "./registry";
import type { KxdRuntimeKind, KxdRuntimeSurface } from "./types";

export type DetectedRuntime = {
  kind: KxdRuntimeKind;
  surface: KxdRuntimeSurface;
  /** Untrusted hint — presence alone does not grant native capabilities. */
  hasNativeBridge: boolean;
  applicationOrigin: string | null;
};

export function detectRuntimeSurface(
  pathname?: string | null,
): KxdRuntimeSurface {
  const path =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  if (path.startsWith("/portal")) return "portal";
  if (
    path.startsWith("/admin") ||
    path.startsWith("/os") ||
    path.startsWith("/api/admin")
  ) {
    return "studio";
  }
  if (!path || path === "/") return "marketing";
  return "unknown";
}

/**
 * Authoritative runtime kind.
 * Spoofed bridge globals cannot elevate this — only a registered adapter can.
 */
export function detectRuntimeKind(): KxdRuntimeKind {
  const adapter = getRuntimeAdapter();
  if (adapter && adapter.kind !== "web") {
    return adapter.kind;
  }
  return "web";
}

export function detectRuntime(pathname?: string | null): DetectedRuntime {
  const host = detectNativeBridgeHost();
  const kind = detectRuntimeKind();
  const applicationOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : null;

  return {
    kind,
    surface: detectRuntimeSurface(pathname),
    hasNativeBridge: host.present,
    applicationOrigin,
  };
}
