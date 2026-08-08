/**
 * Normalize / bound OTP WebsiteLeadEvent payloads for Shared Core storage.
 * Incoming lifecycle/commission fields are reported metadata only — never authority.
 */

import {
  DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
  OTP_WEBSITE_LEAD_ID_PATTERN,
  TEXT_BOUND_LONG,
  TEXT_BOUND_MEDIUM,
  TEXT_BOUND_SHORT,
} from "./constants";
import {
  WEBSITE_LEAD_INGEST_COMMISSION_STATUS,
  WEBSITE_LEAD_INGEST_LIFECYCLE_STATUS,
  type WebsiteLeadNormalizedPayload,
} from "./types";

export type NormalizeWebsiteLeadResult =
  | {
      ok: true;
      payload: WebsiteLeadNormalizedPayload;
      externalEventId: string;
      occurredAt: string;
      /** Field names only — never persist untrusted raw authority values. */
      rejectedAuthorityFields: string[];
    }
  | { ok: false; reason: "malformed" | "invalid_lead_id"; detail: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function boundText(
  value: unknown,
  max: number,
): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

function readNested(
  root: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (key in root) return root[key];
  }
  return undefined;
}

function parseOccurredAt(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  const text = String(value).trim();
  if (!text) return null;
  const d = new Date(text);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/**
 * Accepts envelope + nested/flat OTP WebsiteLeadEvent shapes.
 * Forces commission/sale authority fields to ingest-safe values.
 */
export function normalizeWebsiteLeadPayload(
  body: unknown,
): NormalizeWebsiteLeadResult {
  const root = asRecord(body);
  if (!root) {
    return { ok: false, reason: "malformed", detail: "Body must be a JSON object." };
  }

  const nested = asRecord(root.payload) ?? asRecord(root.lead) ?? {};
  const flat = { ...nested, ...root };

  const leadId =
    boundText(readNested(flat, "leadId", "externalEventId", "id"), TEXT_BOUND_SHORT) ??
    "";
  if (!OTP_WEBSITE_LEAD_ID_PATTERN.test(leadId)) {
    return {
      ok: false,
      reason: "invalid_lead_id",
      detail: "Lead id must match OTP-WEB-YYYYMMDD-XXXXXXXX.",
    };
  }

  const occurredAt =
    parseOccurredAt(
      readNested(flat, "occurredAt", "submittedAt", "submitted_at", "createdAt"),
    ) ?? new Date().toISOString();

  const customerRaw =
    asRecord(readNested(flat, "customer", "contact")) ?? {};
  const utmRaw = asRecord(readNested(flat, "utm", "utms", "attribution")) ?? {};

  const reportedCommissionStatus = boundText(
    readNested(flat, "commissionStatus", "commission_status"),
    TEXT_BOUND_SHORT,
  );
  const reportedSoldAt = readNested(flat, "soldAt", "sold_at");
  const reportedSaleReference = readNested(flat, "saleReference", "sale_reference");
  const reportedLifecycle = boundText(
    readNested(flat, "status", "lifecycleStatus", "lifecycle_status"),
    TEXT_BOUND_SHORT,
  );

  const rejectedAuthorityFields: string[] = [];
  if (
    reportedCommissionStatus &&
    reportedCommissionStatus !== WEBSITE_LEAD_INGEST_COMMISSION_STATUS
  ) {
    rejectedAuthorityFields.push("commissionStatus");
  }
  if (reportedSoldAt != null && reportedSoldAt !== "") {
    rejectedAuthorityFields.push("soldAt");
  }
  if (reportedSaleReference != null && String(reportedSaleReference).trim() !== "") {
    rejectedAuthorityFields.push("saleReference");
  }
  if (
    reportedLifecycle &&
    reportedLifecycle !== WEBSITE_LEAD_INGEST_LIFECYCLE_STATUS
  ) {
    rejectedAuthorityFields.push("lifecycleStatus");
  }

  const amountRaw = readNested(
    flat,
    "commissionAmountCents",
    "commission_amount_cents",
  );
  if (
    amountRaw != null &&
    String(amountRaw).trim() !== String(DEFAULT_OTP_COMMISSION_AMOUNT_CENTS)
  ) {
    rejectedAuthorityFields.push("commissionAmountCents");
  }
  const commissionAmountCents = DEFAULT_OTP_COMMISSION_AMOUNT_CENTS;

  const payload: WebsiteLeadNormalizedPayload = {
    leadId,
    formSource: boundText(
      readNested(flat, "formSource", "form_source", "source", "form"),
      TEXT_BOUND_MEDIUM,
    ),
    formPath: boundText(
      readNested(flat, "formPath", "form_path", "path"),
      TEXT_BOUND_MEDIUM,
    ),
    customer: {
      name: boundText(
        readNested(customerRaw, "name", "fullName", "full_name") ??
          readNested(flat, "customerName", "name"),
        TEXT_BOUND_MEDIUM,
      ),
      email: boundText(
        readNested(customerRaw, "email") ?? readNested(flat, "email", "customerEmail"),
        TEXT_BOUND_MEDIUM,
      ),
      phone: boundText(
        readNested(customerRaw, "phone", "tel") ??
          readNested(flat, "phone", "customerPhone"),
        TEXT_BOUND_SHORT,
      ),
      message: boundText(
        readNested(customerRaw, "message", "notes", "body") ??
          readNested(flat, "message", "notes"),
        TEXT_BOUND_LONG,
      ),
    },
    modelInterest: boundText(
      readNested(flat, "modelInterest", "model", "productModel", "model_interest"),
      TEXT_BOUND_MEDIUM,
    ),
    productInterest: boundText(
      readNested(
        flat,
        "productInterest",
        "product",
        "interest",
        "product_interest",
      ),
      TEXT_BOUND_MEDIUM,
    ),
    utm: {
      source: boundText(readNested(utmRaw, "source", "utm_source") ?? flat.utm_source, TEXT_BOUND_SHORT),
      medium: boundText(readNested(utmRaw, "medium", "utm_medium") ?? flat.utm_medium, TEXT_BOUND_SHORT),
      campaign: boundText(
        readNested(utmRaw, "campaign", "utm_campaign") ?? flat.utm_campaign,
        TEXT_BOUND_MEDIUM,
      ),
      term: boundText(readNested(utmRaw, "term", "utm_term") ?? flat.utm_term, TEXT_BOUND_MEDIUM),
      content: boundText(
        readNested(utmRaw, "content", "utm_content") ?? flat.utm_content,
        TEXT_BOUND_MEDIUM,
      ),
    },
    referrer: boundText(readNested(flat, "referrer", "referer"), TEXT_BOUND_MEDIUM),
    landingPage: boundText(
      readNested(flat, "landingPage", "landing_page", "page"),
      TEXT_BOUND_MEDIUM,
    ),
    lifecycleStatus: WEBSITE_LEAD_INGEST_LIFECYCLE_STATUS,
    commissionAmountCents,
    commissionStatus: WEBSITE_LEAD_INGEST_COMMISSION_STATUS,
    soldAt: null,
    saleReference: null,
  };

  return {
    ok: true,
    payload,
    externalEventId: leadId,
    occurredAt,
    rejectedAuthorityFields,
  };
}

/** Extract eventClass from envelope — defaults not applied here. */
export function readEventClass(body: unknown): string | null {
  const root = asRecord(body);
  if (!root) return null;
  const value = root.eventClass ?? root.event_class ?? root.type;
  if (value == null) return null;
  return String(value).trim().toLowerCase() || null;
}

export function readEnvelopeClientKey(body: unknown): string | null {
  const root = asRecord(body);
  if (!root) return null;
  const value = root.clientKey ?? root.client_key;
  if (value == null) return null;
  return String(value).trim().toLowerCase() || null;
}

export function readEnvelopeSourceSystem(body: unknown): string | null {
  const root = asRecord(body);
  if (!root) return null;
  const value = root.sourceSystem ?? root.source_system ?? root.source;
  if (value == null) return null;
  return String(value).trim().toLowerCase() || null;
}
