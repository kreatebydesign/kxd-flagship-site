/**
 * URL safety for public website audits — blocks SSRF targets before fetch.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.goog",
]);

export class UnsafeAuditUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeAuditUrlError";
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80:")) return true;
  return false;
}

function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".local")) return true;
  if (host.endsWith(".internal")) return true;
  if (host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0") return true;
  return false;
}

async function assertResolvablePublicHost(hostname: string): Promise<void> {
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new UnsafeAuditUrlError(
        "That URL points to a private or local address. Please enter a public website URL.",
      );
    }
    return;
  }

  if (isBlockedHostname(hostname)) {
    throw new UnsafeAuditUrlError(
      "That URL is not allowed. Please enter a public website address.",
    );
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeAuditUrlError(
      "We couldn't resolve that website address. Check the URL and try again.",
    );
  }

  if (!addresses.length) {
    throw new UnsafeAuditUrlError(
      "We couldn't resolve that website address. Check the URL and try again.",
    );
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new UnsafeAuditUrlError(
        "That URL resolves to a private or local address. Please enter a public website URL.",
      );
    }
  }
}

/** Canonical form for duplicate detection (origin + path, no trailing slash). */
export function canonicalAuditWebsiteUrl(url: URL): string {
  const path = url.pathname.replace(/\/+$/, "");
  return path ? `${url.origin}${path}` : url.origin;
}

/**
 * Validate and normalize a public http(s) website URL for auditing.
 * @throws UnsafeAuditUrlError when the URL is not safe to fetch
 */
export async function validateSafePublicWebsiteUrl(
  input: string,
): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new UnsafeAuditUrlError("Website URL is required.");
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new UnsafeAuditUrlError("Please enter a valid website URL.");
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    throw new UnsafeAuditUrlError(
      "Only public http and https website URLs are supported.",
    );
  }

  if (parsed.username || parsed.password) {
    throw new UnsafeAuditUrlError("Website URLs with credentials are not allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    throw new UnsafeAuditUrlError("Please enter a valid website URL.");
  }

  await assertResolvablePublicHost(hostname);

  return canonicalAuditWebsiteUrl(parsed);
}
