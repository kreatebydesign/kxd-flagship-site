/**
 * Phase 30B — Deep link contract (kxdos://).
 * Protocol registration is deferred to a later packaging phase.
 *
 * Auth remains required after resolution — parsing is not authorization.
 */

import { runtimeFail, runtimeOk, type KxdRuntimeResult } from "./errors";
import { normalizeAppPath } from "./navigation";

export const KXD_APP_PROTOCOL = "kxdos";

/**
 * Allowlisted path prefixes for Studio deep links.
 * Portal remains browser; do not deep-link Portal into Studio by default.
 */
export const DEEP_LINK_ALLOWED_PREFIXES = [
  "/admin/operations",
  "/admin/work",
  "/admin/sales",
  "/os",
  "/admin/login",
] as const;

export type DeepLinkParseResult = {
  protocol: string;
  /** Canonical app pathname starting with /. */
  path: string;
  search: string;
  hash: string;
  raw: string;
};

/** Path segments must be safe identifiers or known route tokens — not encoded traversal. */
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

function mapHostToPath(host: string, pathname: string): string {
  const h = host.toLowerCase();
  if (h === "app" || h === "studio") {
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  }
  if (h === "operations") {
    const rest = pathname === "/" ? "" : pathname;
    return `/admin/operations${rest}`;
  }
  if (h === "work") {
    const rest = pathname === "/" ? "" : pathname;
    return `/admin/work${rest}`;
  }
  if (h === "sales") {
    const rest = pathname === "/" ? "" : pathname;
    return `/admin/sales${rest}`;
  }
  if (h === "os") {
    const rest = pathname === "/" ? "" : pathname;
    return `/os${rest}`;
  }
  if (!h && pathname.startsWith("/")) return pathname;
  return `/${h}${pathname === "/" ? "" : pathname}`;
}

export function isDeepLinkAllowed(path: string): boolean {
  return DEEP_LINK_ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function decodePathSafely(pathname: string): KxdRuntimeResult<string> {
  if (pathname.includes("\0")) {
    return runtimeFail("invalid-input", "Deep link path contains a null byte.");
  }
  try {
    // Reject malformed percent-encoding explicitly.
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes("\0")) {
      return runtimeFail("invalid-input", "Deep link path contains a null byte.");
    }
    return runtimeOk(decoded);
  } catch {
    return runtimeFail("invalid-input", "Deep link path has malformed percent-encoding.");
  }
}

/**
 * Validate path segments (route tokens / numeric ids). Rejects `..` and odd encodings.
 */
export function validateDeepLinkSegments(
  path: string,
): KxdRuntimeResult<{ path: string }> {
  const segments = path.split("/").filter((s) => s.length > 0);
  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      return runtimeFail("invalid-input", "Path traversal is not allowed.");
    }
    if (!SAFE_SEGMENT.test(segment)) {
      return runtimeFail("invalid-input", "Deep link segment is not a safe identifier.", {
        details: { reason: "unsafe-segment" },
      });
    }
  }
  return runtimeOk({ path });
}

/**
 * Parse and validate a kxdos:// URL. Does not navigate. Does not authenticate.
 */
export function parseDeepLink(raw: string): KxdRuntimeResult<DeepLinkParseResult> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return runtimeFail("invalid-input", "Deep link is empty.");
  }

  // External http(s) must never be treated as internal deep links.
  if (/^https?:/i.test(trimmed)) {
    return runtimeFail(
      "invalid-input",
      "External http(s) URLs are not internal deep links.",
    );
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return runtimeFail("invalid-input", "Deep link is not a valid URL.");
  }

  if (url.protocol !== `${KXD_APP_PROTOCOL}:`) {
    return runtimeFail(
      "invalid-input",
      `Expected protocol ${KXD_APP_PROTOCOL}:, received ${url.protocol}`,
      { details: { protocol: url.protocol } },
    );
  }

  const decodedPath = decodePathSafely(url.pathname || "/");
  if (!decodedPath.ok) return decodedPath;

  const mapped = mapHostToPath(url.hostname, decodedPath.value);
  const normalized = normalizeAppPath(mapped);
  if (!normalized.ok) return normalized;

  const segments = validateDeepLinkSegments(normalized.value.path);
  if (!segments.ok) return segments;

  if (!isDeepLinkAllowed(normalized.value.path)) {
    return runtimeFail(
      "invalid-input",
      "Deep link path is not on the Studio allowlist.",
      { details: { path: normalized.value.path } },
    );
  }

  return runtimeOk({
    protocol: KXD_APP_PROTOCOL,
    path: normalized.value.path,
    search: url.search,
    hash: url.hash,
    raw: trimmed,
  });
}

/**
 * Browser fallback: convert a validated deep link into a same-origin href.
 * Caller must supply the canonical KXD OS origin.
 */
export function deepLinkToBrowserHref(
  parsed: DeepLinkParseResult,
  origin: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${parsed.path}${parsed.search}${parsed.hash}`;
}
