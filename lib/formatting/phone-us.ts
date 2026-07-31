/**
 * Progressive U.S. phone input helpers for operator forms.
 * International values (leading +, 00, or too many digits) are left unforced.
 */

const US_DIGIT_CAP = 10;

export function extractDigits(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

/** True when the value should not receive U.S. national masking. */
export function isInternationalPhoneInput(value: string): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  if (raw.startsWith("+") || raw.startsWith("00")) return true;
  const digits = extractDigits(raw);
  if (digits.length >= 12) return true;
  // 11 digits not starting with US country code — treat as international/unknown.
  if (digits.length === 11 && digits[0] !== "1") return true;
  return false;
}

function nationalDigits(digits: string): string {
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1, 1 + US_DIGIT_CAP);
  }
  return digits.slice(0, US_DIGIT_CAP);
}

/**
 * Format for controlled inputs while typing.
 * Incomplete: `(555`, `(555) 1`, `(555) 123-4`, …
 * Complete: `(555) 123-4567`
 */
export function formatUsPhoneInput(value: string): string {
  const raw = String(value ?? "");
  if (!raw.trim()) return "";
  if (isInternationalPhoneInput(raw)) {
    return raw;
  }

  const digits = nationalDigits(extractDigits(raw));
  if (digits.length === 0) return "";

  if (digits.length <= 3) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Value to persist on sales-leads / contact records.
 * U.S. 10-digit → `(###) ###-####`. International → trimmed original (no forced mask).
 */
export function normalizePhoneForStorage(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (isInternationalPhoneInput(raw)) {
    return raw.replace(/\s+/g, " ").trim();
  }

  const digits = nationalDigits(extractDigits(raw));
  if (digits.length === 0) return "";
  if (digits.length < US_DIGIT_CAP) {
    // Persist progressive formatting for incomplete local drafts.
    return formatUsPhoneInput(digits);
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
