/**
 * Stable managed-client inquiry identity helpers.
 */

export function buildManagedClientInquiryKey(input: {
  clientKey: string;
  receivedAt?: Date | string;
  suffix?: string;
}): string {
  const clientKey = String(input.clientKey ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!clientKey) {
    throw new Error("clientKey is required for inquiry identity.");
  }

  const when =
    input.receivedAt instanceof Date
      ? input.receivedAt
      : input.receivedAt
        ? new Date(input.receivedAt)
        : new Date();
  const y = when.getUTCFullYear();
  const m = String(when.getUTCMonth() + 1).padStart(2, "0");
  const d = String(when.getUTCDate()).padStart(2, "0");
  const suffix =
    String(input.suffix ?? "")
      .trim()
      .replace(/[^A-Za-z0-9_-]+/g, "")
      .slice(0, 24) || randomSuffix();

  return `MCI-${clientKey}-${y}${m}${d}-${suffix}`;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/** Prefer external stable IDs (e.g. OTP-WEB-…) when present. */
export function resolveInquiryKeyFromSource(input: {
  clientKey: string;
  sourceExternalId?: string | null;
  receivedAt?: string | Date;
}): string {
  const external = String(input.sourceExternalId ?? "").trim();
  if (external) return external.slice(0, 120);
  return buildManagedClientInquiryKey({
    clientKey: input.clientKey,
    receivedAt: input.receivedAt,
  });
}
