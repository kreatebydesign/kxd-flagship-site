/**
 * URL validation for QR destinations.
 * Trims surrounding whitespace only — does not rewrite, shorten, or alter the URL.
 */

export type ValidateDestinationUrlResult =
  | { ok: true; destinationUrl: string }
  | { ok: false; error: string };

/**
 * Accept only absolute http(s) URLs.
 * Preserves exact path, query, hash, trailing slash, and casing after scheme/host normalization
 * performed by the URL constructor for the hostname only.
 *
 * Important: we return the operator-entered string (trimmed), not url.href, so that
 * trailing slashes, query parameter order, and intentional encoding are preserved exactly.
 */
export function validateDestinationUrl(raw: unknown): ValidateDestinationUrlResult {
  if (typeof raw !== "string") {
    return { ok: false, error: "Destination URL is required." };
  }

  const destinationUrl = raw.trim();
  if (!destinationUrl) {
    return { ok: false, error: "Destination URL is required." };
  }

  if (destinationUrl.length > 2048) {
    return { ok: false, error: "Destination URL must be 2048 characters or fewer." };
  }

  if (/\s/.test(destinationUrl)) {
    return { ok: false, error: "Destination URL must not contain whitespace." };
  }

  let parsed: URL;
  try {
    parsed = new URL(destinationUrl);
  } catch {
    return { ok: false, error: "Enter a valid absolute URL (https://…)." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// destinations are allowed." };
  }

  if (!parsed.hostname) {
    return { ok: false, error: "Destination URL must include a hostname." };
  }

  // Return the exact trimmed operator string — never url.href (which can normalize).
  return { ok: true, destinationUrl };
}
