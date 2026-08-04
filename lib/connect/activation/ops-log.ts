/**
 * Phase 6 Batch C4 — operational logging for Connect activation / authorization.
 *
 * Never logs message bodies, conversation content, attachments, or chat text.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { ConnectAccessDenyReason } from "../types";
import type { ConnectOpsEventType, ConnectOpsLogEntry } from "./types";

const SENSITIVE_META_KEY =
  /token|secret|password|credential|message|body|content|conversation|attachment|chat|text/i;

export const CONNECT_OPS_LOG_RELATIVE_PATH = ".connect/ops.log" as const;

function sanitizeMeta(
  meta: ConnectOpsLogEntry["meta"] | undefined,
): ConnectOpsLogEntry["meta"] | undefined {
  if (!meta) return undefined;
  const out: NonNullable<ConnectOpsLogEntry["meta"]> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_META_KEY.test(key)) continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

export function connectOpsEventFromDenyReason(
  reason: ConnectAccessDenyReason,
): ConnectOpsEventType {
  switch (reason) {
    case "kill_switch":
      return "authorization.kill_switch";
    case "feature_disabled":
      return "authorization.global_disabled";
    case "environment_not_allowed":
      return "authorization.environment_denied";
    case "local_activation_required":
      return "authorization.activation_denied";
    case "not_staff_dogfood":
    case "org_not_allowlisted":
      return "authorization.allowlist_denied";
    default:
      return "authorization.failure";
  }
}

/**
 * Append a structured ops event. Safe for local dogfood; never throws to callers.
 */
export function logConnectOpsEvent(
  entry: Omit<ConnectOpsLogEntry, "at"> & { at?: string },
  options?: { cwd?: string; console?: boolean },
): void {
  try {
    const full: ConnectOpsLogEntry = {
      at: entry.at ?? new Date().toISOString(),
      type: entry.type,
      summary: entry.summary.slice(0, 300),
      meta: sanitizeMeta(entry.meta),
    };

    if (options?.console !== false) {
      console.info(
        `[KXD Connect ops] ${full.type}: ${full.summary}`,
        full.meta ?? "",
      );
    }

    const cwd = options?.cwd ?? process.cwd();
    const dir = path.join(cwd, ".connect");
    mkdirSync(dir, { recursive: true });
    const filePath = path.join(cwd, CONNECT_OPS_LOG_RELATIVE_PATH);
    appendFileSync(filePath, `${JSON.stringify(full)}\n`, "utf8");
  } catch (err) {
    console.warn("[KXD Connect ops] log write failed:", err);
  }
}
