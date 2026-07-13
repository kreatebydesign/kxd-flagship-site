/**
 * Phase 30B — Navigation and external URL validation.
 * Next.js App Router paths remain canonical inside the WebView.
 */

import { runtimeFail, runtimeOk, type KxdRuntimeResult } from "./errors";

export type OpenExternalUrlRequest = {
  url: string;
  /**
   * When true, allow http(s) only to known KXD hosts (stricter).
   * Default false: any https URL may open in system browser.
   */
  restrictToKnownHosts?: boolean;
};

const KNOWN_HOST_SUFFIXES = [
  "kreatebydesign.com",
  "localhost",
] as const;

const BLOCKED_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
]);

export function isKnownKxdHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "127.0.0.1" || host === "localhost") return true;
  return KNOWN_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/**
 * Validate an external URL before opening in system browser / new tab.
 */
export function validateExternalUrl(
  request: OpenExternalUrlRequest,
): KxdRuntimeResult<{ url: string; hostname: string }> {
  const raw = request.url?.trim() ?? "";
  if (!raw) {
    return runtimeFail("invalid-input", "URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return runtimeFail("invalid-input", "URL is not valid.", {
      details: { url: raw },
    });
  }

  const protocol = parsed.protocol.toLowerCase();
  if (BLOCKED_PROTOCOLS.has(protocol)) {
    return runtimeFail("invalid-input", `Protocol "${protocol}" is not allowed.`, {
      details: { protocol },
    });
  }

  if (protocol !== "https:" && protocol !== "http:") {
    return runtimeFail(
      "invalid-input",
      "Only http(s) URLs may be opened externally from this contract.",
      { details: { protocol } },
    );
  }

  if (request.restrictToKnownHosts && !isKnownKxdHost(parsed.hostname)) {
    return runtimeFail(
      "invalid-input",
      "Host is not on the known KXD allowlist.",
      { details: { hostname: parsed.hostname } },
    );
  }

  return runtimeOk({ url: parsed.toString(), hostname: parsed.hostname });
}

/**
 * Normalize an in-app Studio path. Does not register OS protocols.
 */
export function normalizeAppPath(pathname: string): KxdRuntimeResult<{ path: string }> {
  const raw = pathname.trim();
  if (!raw.startsWith("/")) {
    return runtimeFail("invalid-input", "App path must start with /.");
  }
  if (raw.startsWith("//")) {
    return runtimeFail("invalid-input", "Protocol-relative paths are not allowed.");
  }
  // Reject obvious traversal in path segments.
  const segments = raw.split("/");
  if (segments.some((s) => s === "..")) {
    return runtimeFail("invalid-input", "Path traversal is not allowed.");
  }
  return runtimeOk({ path: raw });
}
