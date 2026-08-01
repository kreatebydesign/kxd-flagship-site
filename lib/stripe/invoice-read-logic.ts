/**
 * Phase 5 Batch 5B — Pure Stripe invoice read policy and DTO projection.
 * No network. No secrets. No Payload.
 */

import { isStripeCustomerIdFormat } from "./customer-linking-logic";
import {
  STRIPE_PHASE_5B_AUTHORIZED_MODE,
  STRIPE_PHASE_5B_INVOICE_LIST_DEFAULT_LIMIT,
  STRIPE_PHASE_5B_INVOICE_LIST_MAX_LIMIT,
  STRIPE_PHASE_5B_INVOICE_READS_AUTHORIZED,
} from "./invoice-read-auth";
import type {
  BillingProfileInvoiceMapping,
  InvoiceReadListResult,
  InvoiceReadOneResult,
  InvoiceReadUnavailableCode,
  PortalSafeStripeInvoice,
  StripeInvoiceProviderStatus,
  StripeInvoiceReadSnapshot,
} from "./invoice-read-types";
import { isCommercialStripeOperationAllowed } from "./integration-readiness-logic";

/** Pure authorization composition — used by runtime gate and deterministic tests. */
export function resolveInvoiceReadAuthorization(input: {
  phase5bAuthorized: boolean;
  operationAllowed: boolean;
}): boolean {
  return input.phase5bAuthorized === true && input.operationAllowed === true;
}

export function isInvoiceReadOperationAuthorized(
  operation: "invoice_list" | "invoice_read",
): boolean {
  return resolveInvoiceReadAuthorization({
    phase5bAuthorized: STRIPE_PHASE_5B_INVOICE_READS_AUTHORIZED,
    operationAllowed: isCommercialStripeOperationAllowed(operation),
  });
}

export function rejectBrowserInvoiceReadAuthority(body: unknown): {
  ok: boolean;
  code?: InvoiceReadUnavailableCode;
  message?: string;
} {
  if (body == null || typeof body !== "object") return { ok: true };
  const row = body as Record<string, unknown>;
  const forbidden = [
    "stripeCustomerId",
    "customerId",
    "clientId",
    "billingProfileId",
    "stripeMode",
    "mode",
    "accountId",
    "stripeAccountId",
  ] as const;
  for (const key of forbidden) {
    if (key in row && row[key] != null && row[key] !== "") {
      return {
        ok: false,
        code: "browser_authority_rejected",
        message:
          "Browser-supplied customer, client, mode, or account identifiers cannot authorize invoice access.",
      };
    }
  }
  return { ok: true };
}

export function isStripeInvoiceIdFormat(value: string): boolean {
  return /^in_[A-Za-z0-9]+$/.test(value.trim());
}

export function clampInvoiceListLimit(limit?: number | null): number {
  if (limit == null || !Number.isFinite(limit)) {
    return STRIPE_PHASE_5B_INVOICE_LIST_DEFAULT_LIMIT;
  }
  const n = Math.floor(Number(limit));
  if (n < 1) return 1;
  return Math.min(n, STRIPE_PHASE_5B_INVOICE_LIST_MAX_LIMIT);
}

export function normalizeStripeInvoiceStatus(
  status: string | null | undefined,
): StripeInvoiceProviderStatus {
  switch (String(status ?? "").toLowerCase()) {
    case "draft":
      return "draft";
    case "open":
      return "open";
    case "paid":
      return "paid";
    case "uncollectible":
      return "uncollectible";
    case "void":
      return "void";
    default:
      return "unknown";
  }
}

export function unixSecondsToIsoDay(
  value: number | null | undefined,
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const ms = Math.trunc(value) * 1000;
  if (!Number.isFinite(ms)) return null;
  const iso = new Date(ms).toISOString();
  if (Number.isNaN(Date.parse(iso))) return null;
  return iso;
}

export function assertExactMinorUnitAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

/**
 * Project an internal provider snapshot to the allowlisted portal DTO.
 * Never spreads the provider object.
 */
export function projectPortalSafeStripeInvoice(
  snapshot: StripeInvoiceReadSnapshot,
): PortalSafeStripeInvoice {
  const hosted =
    typeof snapshot.hostedInvoiceUrl === "string" &&
    snapshot.hostedInvoiceUrl.trim()
      ? snapshot.hostedInvoiceUrl.trim()
      : null;
  return {
    id: String(snapshot.id),
    number:
      typeof snapshot.number === "string" && snapshot.number.trim()
        ? snapshot.number.trim()
        : null,
    status: normalizeStripeInvoiceStatus(snapshot.status),
    amountDue: assertExactMinorUnitAmount(snapshot.amountDue),
    amountPaid: assertExactMinorUnitAmount(snapshot.amountPaid),
    amountRemaining: assertExactMinorUnitAmount(snapshot.amountRemaining),
    currency: String(snapshot.currency || "usd").toLowerCase(),
    createdAt: unixSecondsToIsoDay(snapshot.created),
    dueDate: unixSecondsToIsoDay(snapshot.dueDate),
    paidAt: unixSecondsToIsoDay(snapshot.paidAt),
    hostedInvoiceUrl: hosted,
    hostedPaymentUrl: hosted,
    hostedReceiptUrl: null,
  };
}

export function assessInvoiceReadMapping(
  mapping: BillingProfileInvoiceMapping | null,
  authorizedClientId: number,
):
  | { ok: true; customerId: string; mode: "test" }
  | { ok: false; code: InvoiceReadUnavailableCode; message: string } {
  if (!mapping) {
    return {
      ok: false,
      code: "missing_billing_profile",
      message: "No billing profile is available for this account.",
    };
  }
  if (mapping.clientId !== authorizedClientId) {
    return {
      ok: false,
      code: "client_mismatch",
      message: "Billing profile does not match the active account.",
    };
  }
  if (!mapping.stripeCustomerId || !mapping.stripeCustomerId.trim()) {
    return {
      ok: false,
      code: "missing_customer_mapping",
      message: "Stripe customer mapping is not configured for this account.",
    };
  }
  if (!isStripeCustomerIdFormat(mapping.stripeCustomerId)) {
    return {
      ok: false,
      code: "invalid_customer_mapping",
      message: "Stripe customer mapping is invalid.",
    };
  }
  if (mapping.stripeCustomerMappingStatus === "unlinked") {
    return {
      ok: false,
      code: "mapping_not_linked",
      message: "Stripe customer mapping is not linked.",
    };
  }
  if (mapping.stripeMode === "live") {
    return {
      ok: false,
      code: "mode_disallowed",
      message:
        "Live-mode invoice reads are not authorized in Batch 5B. Mapping remains unused.",
    };
  }
  if (mapping.stripeMode != null && mapping.stripeMode !== "test") {
    return {
      ok: false,
      code: "mode_mismatch",
      message: "Stripe mapping mode is not usable for invoice reads.",
    };
  }
  if (mapping.stripeMode == null) {
    return {
      ok: false,
      code: "mode_mismatch",
      message: "Stripe mapping mode is missing.",
    };
  }
  if (STRIPE_PHASE_5B_AUTHORIZED_MODE !== "test") {
    return {
      ok: false,
      code: "mode_disallowed",
      message: "Invoice read mode policy rejected this request.",
    };
  }
  return {
    ok: true,
    customerId: mapping.stripeCustomerId.trim(),
    mode: "test",
  };
}

export function invoiceBelongsToMappedCustomer(
  invoiceCustomerId: string | null | undefined,
  mappedCustomerId: string,
): boolean {
  if (!invoiceCustomerId || !mappedCustomerId) return false;
  return invoiceCustomerId.trim() === mappedCustomerId.trim();
}

export function classifyProviderError(err: unknown): {
  code: InvoiceReadUnavailableCode;
  message: string;
} {
  const message =
    err instanceof Error ? err.message.toLowerCase() : String(err ?? "");
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";
  const type =
    err && typeof err === "object" && "type" in err
      ? String((err as { type?: string }).type ?? "")
      : "";

  if (code === "resource_missing") {
    return { code: "invoice_not_found", message: "Invoice is unavailable." };
  }
  if (
    type === "StripePermissionError" ||
    code === "permission_denied" ||
    message.includes("permission")
  ) {
    return {
      code: "provider_permission_denied",
      message: "Invoice provider access was denied.",
    };
  }
  if (
    type === "StripeAuthenticationError" ||
    code === "api_key_expired" ||
    message.includes("invalid api key") ||
    message.includes("authentication")
  ) {
    return {
      code: "provider_auth_failed",
      message: "Invoice provider authentication failed.",
    };
  }
  if (
    type === "StripeConnectionError" ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    code === "ETIMEOUT"
  ) {
    return {
      code: "provider_timeout",
      message: "Invoice provider timed out.",
    };
  }
  if (
    type === "StripeAPIError" ||
    message.includes("service unavailable") ||
    message.includes("overloaded")
  ) {
    return {
      code: "provider_outage",
      message: "Invoice provider is temporarily unavailable.",
    };
  }
  if (message.includes("malformed") || message.includes("json")) {
    return {
      code: "provider_malformed",
      message: "Invoice provider returned an unusable response.",
    };
  }
  return {
    code: "unexpected_failure",
    message: "Invoice data is temporarily unavailable.",
  };
}

export function unavailableList(
  code: InvoiceReadUnavailableCode,
  message: string,
  clientId: number | null,
  limit: number,
): InvoiceReadListResult {
  return {
    availability: "unavailable",
    code,
    message,
    clientId,
    mode: null,
    invoices: [],
    hasMore: false,
    limit,
  };
}

export function unavailableOne(
  code: InvoiceReadUnavailableCode,
  message: string,
  clientId: number | null,
): InvoiceReadOneResult {
  return {
    availability: "unavailable",
    code,
    message,
    clientId,
    mode: null,
    invoice: null,
  };
}

export function buildSuccessfulList(input: {
  clientId: number;
  invoices: PortalSafeStripeInvoice[];
  hasMore: boolean;
  limit: number;
}): InvoiceReadListResult {
  if (input.invoices.length === 0) {
    return {
      availability: "empty",
      code: null,
      message: null,
      clientId: input.clientId,
      mode: "test",
      invoices: [],
      hasMore: false,
      limit: input.limit,
    };
  }
  return {
    availability: "ready",
    code: null,
    message: null,
    clientId: input.clientId,
    mode: "test",
    invoices: input.invoices,
    hasMore: input.hasMore,
    limit: input.limit,
  };
}

/** Uniform cross-customer / forged response — no existence leakage. */
export function safeInvoiceNotFound(
  clientId: number | null,
): InvoiceReadOneResult {
  return unavailableOne(
    "invoice_not_found",
    "Invoice is unavailable.",
    clientId,
  );
}
