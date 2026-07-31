/**
 * Integer-cent money helpers. Never store financial values as IEEE floats.
 */

export type Cents = number;

const CURRENCY_FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  const code = currency.toUpperCase();
  let fmt = CURRENCY_FORMATTERS.get(code);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    CURRENCY_FORMATTERS.set(code, fmt);
  }
  return fmt;
}

/** Parse a dollar string/number into integer cents. Rejects unsafe floats via rounding-from-string. */
export function dollarsToCents(value: unknown): Cents {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100);
  }
  const raw = String(value).trim().replace(/[$,\s]/g, "");
  if (!raw) return 0;
  const neg = raw.startsWith("-");
  const abs = neg ? raw.slice(1) : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(abs)) {
    const n = Number(abs);
    if (!Number.isFinite(n)) return 0;
    const cents = Math.round(n * 100);
    return neg ? -cents : cents;
  }
  const [whole, frac = ""] = abs.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return neg ? -cents : cents;
}

export function centsToDollarsNumber(cents: Cents): number {
  return Math.round(cents) / 100;
}

/**
 * Plain editable dollars for focused currency inputs (no $ / grouping).
 * Whole dollars omit trailing `.00` so typing `11000` stays natural.
 */
export function centsToEditableDollars(cents: Cents): string {
  const n = Math.round(cents || 0);
  const neg = n < 0;
  const abs = Math.abs(n);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const body = frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
  return neg ? `-${body}` : body;
}

export function formatCents(cents: Cents, currency = "USD"): string {
  return formatter(currency).format(centsToDollarsNumber(Math.round(cents)));
}

export function addCents(...values: Cents[]): Cents {
  return values.reduce((sum, v) => sum + Math.round(v || 0), 0);
}

export function subCents(a: Cents, b: Cents): Cents {
  return Math.round(a || 0) - Math.round(b || 0);
}

export function mulCents(cents: Cents, qty: number): Cents {
  const q = Number.isFinite(qty) ? qty : 0;
  // qty may be fractional (e.g. 1.5) — round once at the end
  return Math.round(Math.round(cents || 0) * q);
}

export function percentOfCents(cents: Cents, percent: number): Cents {
  if (!Number.isFinite(percent) || percent === 0) return 0;
  return Math.round((Math.round(cents || 0) * percent) / 100);
}

export function clampNonNegative(cents: Cents): Cents {
  return Math.max(0, Math.round(cents || 0));
}
