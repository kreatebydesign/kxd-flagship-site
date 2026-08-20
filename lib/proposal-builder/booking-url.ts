/**
 * Optional consultation booking URL — HTTPS only.
 * Blank is valid (hidden from clients). Invalid values fail closed publicly.
 */

export function isBlankBookingUrl(value: string | null | undefined): boolean {
  return !String(value ?? "").trim();
}

export function parseHttpsBookingUrl(
  value: string | null | undefined,
): { ok: true; url: string | null } | { ok: false; error: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: true, url: null };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Booking link must be a valid HTTPS URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Booking link must use HTTPS." };
  }
  if (!parsed.hostname) {
    return { ok: false, error: "Booking link must be a valid HTTPS URL." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Booking link cannot include credentials." };
  }

  return { ok: true, url: parsed.toString() };
}

/** Public CTA href — never returns a non-HTTPS URL. */
export function publicBookingUrl(value: string | null | undefined): string | null {
  const parsed = parseHttpsBookingUrl(value);
  if (!parsed.ok) return null;
  return parsed.url;
}
