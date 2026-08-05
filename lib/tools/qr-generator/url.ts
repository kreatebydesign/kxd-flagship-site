/**
 * QR Generator — exact URL preservation and validation.
 * Trims outer whitespace only; never rewrites the submitted absolute URL.
 */

export type QrUrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const UNSUPPORTED_PROTOCOL_MESSAGE =
  "Only absolute http:// or https:// URLs are supported. Other protocols are blocked for safety.";

/**
 * Normalize for validation only: trim accidental outer whitespace.
 * The returned `url` is the exact value that must be encoded into the QR.
 */
export function prepareQrUrlInput(raw: string): string {
  return raw.trim();
}

export function validateQrUrl(raw: string): QrUrlValidationResult {
  const url = prepareQrUrlInput(raw);

  if (!url) {
    return { ok: false, error: "Enter a URL to generate a QR code." };
  }

  if (/\s/.test(url)) {
    return {
      ok: false,
      error: "URL cannot contain spaces. Encode spaces as %20 if needed.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      ok: false,
      error: "Enter a valid absolute URL beginning with http:// or https://.",
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    return { ok: false, error: UNSUPPORTED_PROTOCOL_MESSAGE };
  }

  // Reject URL() “helpful” repair: if the constructor changed the string, refuse.
  // Exception: URL() always lowercases the protocol host presentation in href for
  // some cases — we encode the *user-submitted* trimmed string, not parsed.href.
  // We only require that parsing succeeds and the protocol is http(s).
  if (!/^https?:\/\//i.test(url)) {
    return {
      ok: false,
      error: "Enter a valid absolute URL beginning with http:// or https://.",
    };
  }

  return { ok: true, url };
}

/** Build a filesystem-safe download basename from the exact encoded URL. */
export function buildQrFilenameBase(
  exactUrl: string,
  now: Date = new Date(),
): string {
  let host = "link";
  let pathPart = "";
  try {
    const parsed = new URL(exactUrl);
    host = parsed.hostname.replace(/^www\./i, "") || "link";
    pathPart = parsed.pathname
      .replace(/\/+$/, "")
      .replace(/^\//, "")
      .replace(/\//g, "-");
  } catch {
    host = "link";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  const stamp = `${year}${month}${day}`;

  const slug = [host, pathPart]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `kxd-qr-${slug || "link"}-${stamp}`;
}
