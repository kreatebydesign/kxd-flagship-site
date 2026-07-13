/**
 * Phase 30B — Structured runtime results and errors.
 * Unsupported / denied / unavailable paths return results — they do not throw.
 */

export type KxdRuntimeErrorCode =
  | "unsupported"
  | "permission-denied"
  | "invalid-input"
  | "temporarily-unavailable"
  | "not-initialized"
  | "bridge-unavailable"
  | "bridge-rejected"
  | "network"
  | "cancelled"
  | "internal";

/** Safe detail keys — never put secrets, env, sessions, or raw filesystem paths here. */
const SAFE_DETAIL_KEYS = new Set([
  "capability",
  "code",
  "command",
  "expected",
  "hostname",
  "kind",
  "path",
  "protocol",
  "status",
  "reason",
]);

export type KxdRuntimeError = {
  code: KxdRuntimeErrorCode;
  message: string;
  capability?: string;
  details?: Record<string, unknown>;
};

export type KxdRuntimeOk<T> = {
  ok: true;
  value: T;
};

export type KxdRuntimeFail = {
  ok: false;
  error: KxdRuntimeError;
};

export type KxdRuntimeResult<T> = KxdRuntimeOk<T> | KxdRuntimeFail;

/**
 * Strip unsafe detail values (paths, secrets, env dumps) from error payloads.
 */
export function sanitizeErrorDetails(
  details?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!details) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (!SAFE_DETAIL_KEYS.has(key)) continue;
    if (typeof value === "string") {
      if (
        value.includes("SECRET") ||
        value.includes("TOKEN") ||
        value.includes("PASSWORD") ||
        looksLikeFilesystemSecret(value)
      ) {
        continue;
      }
      if (value.length > 200) {
        out[key] = `${value.slice(0, 200)}…`;
        continue;
      }
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function looksLikeFilesystemSecret(value: string): boolean {
  if (/^[a-zA-Z]:[\\/]/.test(value)) return true;
  const blocked = ["/etc/", "/Users/", "/home/", "/var/", "/tmp/", "/private/"];
  return blocked.some((prefix) => value.startsWith(prefix));
}

export function runtimeOk<T>(value: T): KxdRuntimeOk<T> {
  return { ok: true, value };
}

export function runtimeFail(
  code: KxdRuntimeErrorCode,
  message: string,
  extras?: Pick<KxdRuntimeError, "capability" | "details">,
): KxdRuntimeFail {
  return {
    ok: false,
    error: {
      code,
      message,
      capability: extras?.capability,
      details: sanitizeErrorDetails(extras?.details),
    },
  };
}

export function unsupported(
  capability: string,
  message?: string,
): KxdRuntimeFail {
  return runtimeFail(
    "unsupported",
    message ?? `Capability "${capability}" is not supported in this runtime.`,
    { capability },
  );
}
