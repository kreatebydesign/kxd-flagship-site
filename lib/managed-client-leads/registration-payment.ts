/**
 * Primal event registration payment — ingest normalization and state transitions.
 * Stripe authority stays on Primal; KXD stores receipt metadata only.
 */

export const REGISTRATION_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "payment_exception",
] as const;

export type RegistrationPaymentStatus = (typeof REGISTRATION_PAYMENT_STATUSES)[number];

export type RegistrationPaymentPatch = {
  registrationId: string | null;
  programLabel: string | null;
  courseId: string | null;
  paymentStatus: RegistrationPaymentStatus | null;
  paymentAmountCents: number | null;
  paymentCurrency: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  eventStartsOn: string | null;
  eventEndsOn: string | null;
};

const STATUS_RANK: Record<RegistrationPaymentStatus, number> = {
  pending: 10,
  failed: 20,
  payment_exception: 30,
  paid: 40,
  refunded: 50,
};

export function isRegistrationPaymentStatus(value: unknown): value is RegistrationPaymentStatus {
  return (
    typeof value === "string" &&
    (REGISTRATION_PAYMENT_STATUSES as readonly string[]).includes(value)
  );
}

export function isRegistrationSourceExternalId(id: string): boolean {
  const trimmed = id.trim();
  return /^evtreg_[a-z0-9]+_[a-z0-9]+$/i.test(trimmed);
}

/** Whether this ingest row carries trusted registration payment metadata from Primal. */
export function hasRegistrationPaymentPatch(patch: RegistrationPaymentPatch): boolean {
  return Boolean(
    patch.registrationId ||
      patch.paymentStatus ||
      patch.paymentAmountCents != null ||
      patch.stripeCheckoutSessionId ||
      patch.stripePaymentIntentId,
  );
}

function parseIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value.trim());
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

function parseDateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseCents(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

function boundText(value: unknown, max: number): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

/**
 * Parse optional registration payment fields from a signed ingest body.
 * Ignores payment status unless registrationId / evtreg source is present.
 */
export function parseRegistrationPaymentPatch(
  root: Record<string, unknown>,
  sourceExternalId: string,
): RegistrationPaymentPatch {
  const registrationId =
    boundText(root.registrationId, 120) ??
    (isRegistrationSourceExternalId(sourceExternalId) ? sourceExternalId : null);

  const payment = root.payment;
  const paymentObj =
    payment && typeof payment === "object" && !Array.isArray(payment)
      ? (payment as Record<string, unknown>)
      : root;

  const statusRaw = paymentObj.paymentStatus ?? root.paymentStatus;
  const paymentStatus = isRegistrationPaymentStatus(statusRaw) ? statusRaw : null;

  const programLabel =
    boundText(paymentObj.programLabel ?? root.programLabel ?? root.eventName, 200) ??
    null;
  const courseId = boundText(paymentObj.courseId ?? root.courseId, 120);

  if (!registrationId && !paymentStatus) {
    return {
      registrationId: null,
      programLabel: null,
      courseId: null,
      paymentStatus: null,
      paymentAmountCents: null,
      paymentCurrency: null,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      paidAt: null,
      refundedAt: null,
      eventStartsOn: null,
      eventEndsOn: null,
    };
  }

  const currency = boundText(paymentObj.paymentCurrency ?? root.paymentCurrency ?? "usd", 8);

  return {
    registrationId,
    programLabel,
    courseId,
    paymentStatus: registrationId ? paymentStatus : null,
    paymentAmountCents: registrationId ? parseCents(paymentObj.paymentAmountCents ?? root.paymentAmountCents) : null,
    paymentCurrency: registrationId ? currency?.toLowerCase() ?? "usd" : null,
    stripeCheckoutSessionId: registrationId
      ? boundText(paymentObj.stripeCheckoutSessionId ?? root.stripeCheckoutSessionId, 200)
      : null,
    stripePaymentIntentId: registrationId
      ? boundText(paymentObj.stripePaymentIntentId ?? root.stripePaymentIntentId, 200)
      : null,
    paidAt: registrationId ? parseIsoDate(paymentObj.paidAt ?? root.paidAt) : null,
    refundedAt: registrationId ? parseIsoDate(paymentObj.refundedAt ?? root.refundedAt) : null,
    eventStartsOn: parseDateOnly(paymentObj.eventStartsOn ?? root.eventStartDate ?? root.eventStartsOn),
    eventEndsOn: parseDateOnly(paymentObj.eventEndsOn ?? root.eventEndDate ?? root.eventEndsOn),
  };
}

/**
 * State transition policy (Primal → KXD receipt).
 *
 * - Pending cannot overwrite paid or refunded.
 * - Paid cannot revert to pending or failed.
 * - Refund only applies from paid (or idempotent refund).
 * - payment_exception can arrive before paid; paid still wins after exception unless refunded.
 * - Same or higher rank allowed; lower rank rejected.
 */
export function canApplyRegistrationPaymentTransition(
  current: RegistrationPaymentStatus | null | undefined,
  next: RegistrationPaymentStatus,
): boolean {
  if (!current) return true;
  if (current === next) return true;

  if (current === "paid" && (next === "pending" || next === "failed")) return false;
  if (current === "refunded" && next !== "refunded") return false;
  if (current === "paid" && next === "payment_exception") return false;

  if (next === "refunded") return current === "paid" || current === "refunded";

  return STATUS_RANK[next] >= STATUS_RANK[current];
}

export function formatRegistrationPaymentAmount(
  cents: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  const code = (currency ?? "usd").toUpperCase();
  const major = (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${major} ${code}`;
}

export function registrationPaymentStatusLabel(
  status: RegistrationPaymentStatus | null | undefined,
): string | null {
  if (!status) return null;
  switch (status) {
    case "pending":
      return "Payment pending";
    case "paid":
      return "Payment confirmed";
    case "failed":
      return "Payment failed";
    case "refunded":
      return "Refunded";
    case "payment_exception":
      return "Payment exception";
    default:
      return status;
  }
}