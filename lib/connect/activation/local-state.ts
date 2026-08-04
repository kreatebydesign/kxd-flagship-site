/**
 * Phase 6 Batch C4 — local activation state file.
 *
 * Path: `.connect/local-activation.json` (gitignored).
 * Re-read on every evaluation — no process-level authorization cache.
 * Unavailable / ignored in production environments.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getConnectOrganizationAllowlist,
  getConnectStaffDogfoodEmails,
} from "../config";
import { isConnectProductionEnvironment } from "./environment";
import {
  CONNECT_LOCAL_ACTIVATION_VERSION,
  type ConnectLocalActivationState,
} from "./types";

export const CONNECT_LOCAL_ACTIVATION_RELATIVE_PATH =
  ".connect/local-activation.json" as const;

function normalizeEmailList(values: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const value of values) {
    const n = value.trim().toLowerCase();
    if (n) out.add(n);
  }
  return [...out].sort();
}

function normalizeKeyList(values: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const value of values) {
    const n = value.trim().toLowerCase();
    if (n) out.add(n);
  }
  return [...out].sort();
}

export function resolveConnectLocalActivationPath(
  cwd: string = process.cwd(),
): string {
  return path.join(cwd, CONNECT_LOCAL_ACTIVATION_RELATIVE_PATH);
}

export function createDisabledConnectLocalActivationState(
  partial?: Partial<ConnectLocalActivationState>,
): ConnectLocalActivationState {
  return {
    version: CONNECT_LOCAL_ACTIVATION_VERSION,
    enabled: false,
    updatedAt: new Date().toISOString(),
    staffEmails: normalizeEmailList(partial?.staffEmails ?? []),
    organizationKeys: normalizeKeyList(partial?.organizationKeys ?? []),
    ...(partial?.note ? { note: partial.note.slice(0, 200) } : {}),
  };
}

function parseActivationState(raw: unknown): ConnectLocalActivationState | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as Record<string, unknown>;
  if (doc.version !== CONNECT_LOCAL_ACTIVATION_VERSION) return null;
  if (typeof doc.enabled !== "boolean") return null;
  if (typeof doc.updatedAt !== "string") return null;
  const staffEmails = Array.isArray(doc.staffEmails)
    ? normalizeEmailList(doc.staffEmails.map(String))
    : [];
  const organizationKeys = Array.isArray(doc.organizationKeys)
    ? normalizeKeyList(doc.organizationKeys.map(String))
    : [];
  const note =
    typeof doc.note === "string" ? doc.note.slice(0, 200) : undefined;
  return {
    version: CONNECT_LOCAL_ACTIVATION_VERSION,
    enabled: doc.enabled,
    updatedAt: doc.updatedAt,
    staffEmails,
    organizationKeys,
    ...(note ? { note } : {}),
  };
}

/**
 * Read local activation state. Never caches.
 * Production environments always return disabled (file ignored).
 */
export function readConnectLocalActivationState(input?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): ConnectLocalActivationState {
  const env = input?.env ?? process.env;
  if (isConnectProductionEnvironment(env)) {
    return createDisabledConnectLocalActivationState();
  }

  const filePath = resolveConnectLocalActivationPath(input?.cwd);
  if (!existsSync(filePath)) {
    return createDisabledConnectLocalActivationState();
  }

  try {
    const parsed = parseActivationState(
      JSON.parse(readFileSync(filePath, "utf8")) as unknown,
    );
    if (!parsed) {
      return createDisabledConnectLocalActivationState();
    }
    return parsed;
  } catch {
    return createDisabledConnectLocalActivationState();
  }
}

export function isConnectLocalActivationEnabled(input?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): boolean {
  return readConnectLocalActivationState(input).enabled === true;
}

/**
 * Build enablement payload from env allowlists (fail closed if empty).
 */
export function buildConnectLocalActivationFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  options?: { note?: string; enabled?: boolean },
): ConnectLocalActivationState {
  return {
    version: CONNECT_LOCAL_ACTIVATION_VERSION,
    enabled: options?.enabled ?? true,
    updatedAt: new Date().toISOString(),
    staffEmails: normalizeEmailList(getConnectStaffDogfoodEmails(env)),
    organizationKeys: normalizeKeyList(getConnectOrganizationAllowlist(env)),
    ...(options?.note ? { note: options.note.slice(0, 200) } : {}),
  };
}

export function writeConnectLocalActivationState(
  state: ConnectLocalActivationState,
  input?: { cwd?: string; env?: NodeJS.ProcessEnv },
): ConnectLocalActivationState {
  const env = input?.env ?? process.env;
  if (isConnectProductionEnvironment(env)) {
    throw new Error(
      "Refusing Connect local activation write: production environment. " +
        "Local dogfood activation is unavailable in production.",
    );
  }
  if (env.VERCEL === "1" && env.VERCEL_ENV === "production") {
    throw new Error(
      "Refusing Connect local activation write: Vercel production.",
    );
  }

  const cwd = input?.cwd ?? process.cwd();
  const dir = path.join(cwd, ".connect");
  mkdirSync(dir, { recursive: true });

  const next: ConnectLocalActivationState = {
    version: CONNECT_LOCAL_ACTIVATION_VERSION,
    enabled: state.enabled === true,
    updatedAt: new Date().toISOString(),
    staffEmails: normalizeEmailList(state.staffEmails),
    organizationKeys: normalizeKeyList(state.organizationKeys),
    ...(state.note ? { note: state.note.slice(0, 200) } : {}),
  };

  const filePath = resolveConnectLocalActivationPath(cwd);
  writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function getEffectiveConnectStaffAllowlist(input?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Test injection — bypasses file/env resolution. */
  override?: ReadonlySet<string> | null;
}): ReadonlySet<string> {
  if (input?.override) return input.override;
  const env = input?.env ?? process.env;
  const state = readConnectLocalActivationState({ cwd: input?.cwd, env });
  if (state.staffEmails.length > 0) {
    return new Set(state.staffEmails);
  }
  return getConnectStaffDogfoodEmails(env);
}

export function getEffectiveConnectOrganizationAllowlist(input?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  override?: ReadonlySet<string> | null;
}): ReadonlySet<string> {
  if (input?.override) return input.override;
  const env = input?.env ?? process.env;
  const state = readConnectLocalActivationState({ cwd: input?.cwd, env });
  if (state.organizationKeys.length > 0) {
    return new Set(state.organizationKeys);
  }
  return getConnectOrganizationAllowlist(env);
}
