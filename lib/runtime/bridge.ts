/**
 * Phase 30B — Future native bridge contract (design only).
 *
 * Application code must NEVER import Tauri/Electron.
 * A future desktop adapter will implement KxdRuntimeAdapter by calling
 * this allowlisted bridge — nothing else.
 *
 * Forbidden from the bridge:
 * - shell / arbitrary process execution
 * - unrestricted filesystem
 * - Payload internals
 * - Neon / database access
 * - environment secrets enumeration
 * - authentication bypass
 */

import { runtimeFail, runtimeOk, type KxdRuntimeResult } from "./errors";

export const NATIVE_BRIDGE_PROTOCOL_VERSION = "30B.1";

/**
 * Allowlisted commands only. Adding a command requires architecture review.
 */
export type NativeBridgeCommand =
  | "ping"
  | "get-os-info"
  | "get-system-timezone"
  | "open-external-url"
  | "show-notification"
  | "request-notification-permission"
  | "set-badge"
  | "clipboard-write"
  | "clipboard-read"
  | "secure-storage-get"
  | "secure-storage-set"
  | "secure-storage-delete"
  | "save-file-dialog"
  | "open-file-dialog"
  | "reveal-file"
  | "download-to-path"
  | "check-for-update"
  | "install-update"
  | "get-theme"
  | "emit-deep-link";

export const NATIVE_BRIDGE_COMMANDS: readonly NativeBridgeCommand[] = [
  "ping",
  "get-os-info",
  "get-system-timezone",
  "open-external-url",
  "show-notification",
  "request-notification-permission",
  "set-badge",
  "clipboard-write",
  "clipboard-read",
  "secure-storage-get",
  "secure-storage-set",
  "secure-storage-delete",
  "save-file-dialog",
  "open-file-dialog",
  "reveal-file",
  "download-to-path",
  "check-for-update",
  "install-update",
  "get-theme",
  "emit-deep-link",
] as const;

export type NativeBridgeRequest = {
  protocolVersion: string;
  command: NativeBridgeCommand;
  requestId: string;
  payload?: Record<string, unknown>;
};

export type NativeBridgeResponse = {
  protocolVersion: string;
  requestId: string;
  ok: boolean;
  value?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

/** Host hint injected by a future shell — never trust for authorization. */
export type NativeBridgeHostHint = {
  present: boolean;
  runtimeKind?: "desktop-macos" | "desktop-windows" | "desktop-linux";
  protocolVersion?: string;
};

declare global {
  interface Window {
    __KXD_NATIVE_BRIDGE__?: {
      invoke: (request: NativeBridgeRequest) => Promise<NativeBridgeResponse>;
      host?: NativeBridgeHostHint;
    };
  }
}

export function isNativeBridgeCommand(
  value: string,
): value is NativeBridgeCommand {
  return (NATIVE_BRIDGE_COMMANDS as readonly string[]).includes(value);
}

export function validateBridgeRequest(
  request: NativeBridgeRequest,
): KxdRuntimeResult<NativeBridgeRequest> {
  if (request.protocolVersion !== NATIVE_BRIDGE_PROTOCOL_VERSION) {
    return runtimeFail(
      "bridge-rejected",
      `Unsupported bridge protocol version: ${request.protocolVersion}`,
      { details: { expected: NATIVE_BRIDGE_PROTOCOL_VERSION } },
    );
  }
  if (!isNativeBridgeCommand(request.command)) {
    return runtimeFail("bridge-rejected", "Command is not allowlisted.", {
      details: { command: request.command },
    });
  }
  if (!request.requestId?.trim()) {
    return runtimeFail("invalid-input", "requestId is required.");
  }
  return runtimeOk(request);
}

/**
 * Detect whether a native host bridge object is present.
 * Untrusted hint only — does NOT establish desktop runtime kind or capabilities.
 * Query params / cookies / user-agent must never be consulted here.
 */
export function detectNativeBridgeHost(): NativeBridgeHostHint {
  if (typeof window === "undefined") {
    return { present: false };
  }
  const bridge = window.__KXD_NATIVE_BRIDGE__;
  if (typeof bridge?.invoke === "function") {
    return {
      present: true,
      runtimeKind: bridge.host?.runtimeKind,
      protocolVersion: bridge.host?.protocolVersion,
    };
  }
  return { present: false };
}

/**
 * Invoke an allowlisted bridge command. Transport only — not a business API.
 * Absence returns a structured unavailable result (never throws for missing bridge).
 */
export async function invokeNativeBridge(
  request: NativeBridgeRequest,
): Promise<KxdRuntimeResult<unknown>> {
  const validated = validateBridgeRequest(request);
  if (!validated.ok) return validated;

  if (typeof window === "undefined" || !window.__KXD_NATIVE_BRIDGE__?.invoke) {
    return runtimeFail(
      "bridge-unavailable",
      "Native bridge is not available in this runtime.",
      { details: { reason: "bridge-absent" } },
    );
  }

  try {
    const response = await window.__KXD_NATIVE_BRIDGE__.invoke(validated.value);
    if (!response?.ok) {
      return runtimeFail(
        "bridge-rejected",
        response?.error?.message ?? "Native bridge rejected the command.",
        { details: { command: validated.value.command } },
      );
    }
    return runtimeOk(response.value);
  } catch {
    return runtimeFail(
      "temporarily-unavailable",
      "Native bridge invocation failed temporarily.",
      { details: { command: validated.value.command } },
    );
  }
}

/**
 * Forbidden bridge surface — documented for security review.
 * These must never appear as NativeBridgeCommand values.
 */
export const FORBIDDEN_BRIDGE_CAPABILITIES = [
  "shell-exec",
  "eval",
  "unrestricted-fs-read",
  "unrestricted-fs-write",
  "payload-direct",
  "neon-direct",
  "env-dump",
  "auth-bypass",
  "set-session-cookie",
] as const;
